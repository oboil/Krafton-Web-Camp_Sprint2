from flask import Flask, render_template, request, jsonify
from pymongo.mongo_client import MongoClient
import certifi
from weather_service import WeatherService
from data_service import DataService
from background_scheduler import BackgroundScheduler
import random
import base64
import hmac
import hashlib
import time
import json
from urllib.parse import urlencode
import requests

from dotenv import load_dotenv
import os
load_dotenv()

# MongoDB 연결
uri = os.getenv('MONGODB_URI')
app = Flask(__name__)
client = MongoClient(uri, tlsCAFile=certifi.where())

# 서비스 초기화
weather_service = WeatherService(client)
data_service = DataService(client)
scheduler = BackgroundScheduler()

# 추천 DB 연결 (기존 client 사용)
recommend_db = client["AdditionalFeature"]
recommend_collection = recommend_db["recommendations"]

# ===== 추천 기능 관련 전역 변수 =====
shown_this_round_clothes = set()
shown_this_round_food = set()

@app.route("/")
def home():
    return render_template('index.html')

@app.route('/get_data')    
def get_data():
    province = request.args.get('province')
    names = data_service.get_regions_by_province(province)
    return jsonify(names)

@app.route('/result')    
def result():
    feeling = request.args.get("feeling")
    do = request.args.get("d0")
    si = request.args.get("si")
    detail = request.args.get("detail")
    
    data = data_service.save_vote_result(feeling, do, si, detail)
    return jsonify(data)

@app.route('/get_weather_data')
def get_weather_data():
    level = request.args.get('level', 'provinces')
    province = request.args.get('province')
    
    weather_stats, detail_arrays = data_service.get_weather_data(level, province)
    
    return jsonify({
        "weather_stats": weather_stats,
        "detail_arrays": detail_arrays
    })

@app.route('/generate_test_data')
def generate_test_data():
    updated_count = data_service.generate_test_data()
    return jsonify({
        "status": "success", 
        "message": f"{updated_count}개 지역에 임의 데이터 생성 완료"
    })

@app.route('/get_raw_stats')
def get_raw_stats():
    province = request.args.get('province')
    stats = data_service.get_raw_stats(province)
    return jsonify(stats)

@app.route('/update_temperature_data', methods=['POST'])
def manual_update_temperature():
    """수동 온도 데이터 업데이트 (캐시 확인)"""
    try:
        updated_count = weather_service.update_temperature_data_smart()

        if updated_count == 0:
            return jsonify({
                "status": "success",
                "message": "온도 데이터가 최근에 업데이트되어 스킵되었습니다.",
                "updated_count": 0
            })
        
        return jsonify({
            "status": "success",
            "message": f"{updated_count}개 지역 온도 데이터 업데이트 완료",
            "updated_count": updated_count
        })
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"온도 데이터 업데이트 실패: {str(e)}"
        }), 500

@app.route('/get_region_info')
def get_region_info():
    province = request.args.get('province')
    region = request.args.get('region')
    
    region_data = data_service.get_region_info(province, region)
    return jsonify(region_data)

@app.route('/update_region_temperature', methods=['POST'])
def update_region_temperature():
    """특정 지역 온도 데이터만 업데이트"""
    province = request.json.get('province')
    region = request.json.get('region')
    
    try:
        updated_count = weather_service.update_temperature_data_by_region(province, region)
        return jsonify({
            "status": "success",
            "message": f"{updated_count}개 지역 온도 데이터 업데이트 완료"
        })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": str(e)
        }), 500
    
@app.route('/find_province_by_region')
def find_province_by_region():
    region_name = request.args.get('region')
    
    for collection_name in data_service.collections:
        collection = data_service.db[collection_name]
        if collection.find_one({"name": region_name}):
            return jsonify({"province": collection_name})
    
    return jsonify({"error": "지역을 찾을 수 없습니다"}), 404

def make_signature(method, basestring, timestamp, access_key, secret_key):
    message = f"{method} {basestring}\n{timestamp}\n{access_key}"
    message = message.encode('utf-8')
    secret_key = secret_key.encode('utf-8')
    signature = base64.b64encode(
        hmac.new(secret_key, message, digestmod=hashlib.sha256).digest()
    ).decode('utf-8')
    return signature

def requestApi(timestamp, access_key, signature, uri):
    headers = {
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': access_key,
        'x-ncp-apigw-signature-v2': signature
    }
    res = requests.get(uri, headers=headers)
    data = json.loads(res.text)
    return data

@app.route("/get_Location")
def get_Location():
    IP = request.remote_addr
    print("Ip = %s" % request.remote_addr)
    
    # # 로컬 개발 환경에서는 테스트용 IP 사용
    # if IP == "127.0.0.1" or IP.startswith("192.168") or IP.startswith("10."):
    #     IP = "8.8.8.8"  # 테스트용 IP
    
    method = "GET"
    path = "/geolocation/v2/geoLocation"
    params = {
        "ip": IP,
        "ext": "t",
        "enc": "utf-8",
        "responseFormatType": "json"
    }
    
    query = urlencode(params)
    basestring = f"{path}?{query}"
    timestamp = str(int(time.time() * 1000))
    access_key = os.getenv('NAVER_ACCESS_KEY')
    secret_key = os.getenv('NAVER_SECRET_KEY')
    
    try:
        signature = make_signature(method, basestring, timestamp, access_key, secret_key)
        hostname = "https://geolocation.apigw.ntruss.com"
        requestUri = f"{hostname}{path}?{query}"
        response = requestApi(timestamp, access_key, signature, requestUri)
        print(response)
        
        if 'geoLocation' in response:
            r1 = response['geoLocation']['r1']  # 광역시/도
            r2 = response['geoLocation']['r2'].split()[0]  # 시/군/구
            return jsonify({"success": True, "province": r1, "city": r2})
        else:
            return jsonify({"success": False, "error": "위치 정보를 찾을 수 없습니다"})
    except Exception as e:
        print(f"위치 조회 실패: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/get_ranking_data')
def get_ranking_data():
    """DB에 저장된 데이터로 랭킹 계산"""
    ranking_data = data_service.get_ranking_data()
    return jsonify(ranking_data)

@app.route('/quiz_result')
def quiz_result():
    d0 = request.args.get("d0")
    si = request.args.get("si")
    
    try:
        collection = data_service.db[d0]
        region_doc = collection.find_one({"name": si})
        
        if region_doc and 'temperature' in region_doc:
            temp = region_doc['temperature']
            return jsonify(temp)
        else:
            return jsonify(None)
    except Exception as e:
        print(f"퀴즈 온도 조회 실패: {e}")
        return jsonify(None)

@app.route('/api/recommendations/<feeling>')
def get_recommendation(feeling):
    feeling_id = f"{feeling}_추천"
    rec = recommend_collection.find_one({"_id": feeling_id})
    if not rec:
        return jsonify({"error": "데이터 없음"}), 404

    # 전체 리스트를 반환하여 클라이언트에서 처리하도록 변경
    return jsonify({
        "clothes": rec.get("clothes", []),
        "food": rec.get("food", [])
    })

@app.route('/api/like', methods=['POST'])
def add_like():
    try:
        data = request.json
        feeling_id = data['feeling'] + "_추천"

        if data["type"] == "clothes":
            result = recommend_collection.update_one(
                {"_id": feeling_id, "clothes.name": data["clothes_name"]},
                {"$inc": {"clothes.$.likes": 1}}
            )
        elif data["type"] == "food":
            result = recommend_collection.update_one(
                {"_id": feeling_id, "food.name": data["food_name"]},
                {"$inc": {"food.$.likes": 1}}
            )
        else:
            return jsonify({"error": "타입 오류"}), 400

        if result.modified_count == 0:
            return jsonify({"error": "업데이트 실패"}), 400

        return jsonify({"success": True})
    except Exception as e:
        print(f"좋아요 처리 실패: {e}")
        return jsonify({"error": "서버 오류"}), 500

# ===== 추천 로직 함수 =====
def recommend_from_list(items, shown_this_round, debug=False):
    if not items:
        return None

    if len(shown_this_round) >= len(items):
        return None

    candidates = [x for x in items if x["name"] not in shown_this_round]
    if not candidates:
        candidates = items

    if random.random() < 0.9:
        weights = [(x.get("likes",0)+1) / (x.get("shown_count",0)+1) for x in candidates]
        total = sum(weights)
        
        r = random.uniform(0, total)
        upto = 0
        chosen = candidates[0]
        for item, w in zip(candidates, weights):
            if upto + w >= r:
                chosen = item
                break
            upto += w
    else:
        chosen = random.choice(candidates)

    shown_this_round.add(chosen["name"])

    # shown_count 증가
    recommend_collection.update_one(
        {"$or": [{"clothes.name": chosen["name"]}, {"food.name": chosen["name"]}]},
        {"$inc": {"clothes.$[elem].shown_count": 1, "food.$[elem].shown_count": 1}},
        array_filters=[{"elem.name": chosen["name"]}]
    )

    return chosen

if __name__ == '__main__':
    scheduler.start_scheduler() # 백그라운드 스케줄러
    print("서버가 시작됩니다...")
    app.run(debug=True, host='0.0.0.0', port=5000)