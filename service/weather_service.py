import requests
import datetime
from pymongo.mongo_client import MongoClient
import certifi
import time

from dotenv import load_dotenv
import os
load_dotenv()

class WeatherService:
    def __init__(self, client):
        self.client = client
        self.db = client.korea_regions_db
        self.authKey = os.getenv('WEATHER_API_KEY')
        self.collections = ['서울특별시', '부산광역시', '강원도', '대구광역시', '인천광역시', 
                           '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도',
                           '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도']
    
    def update_temperature_data(self):
        """모든 지역의 온도 데이터를 기상청 API로 가져와서 DB에 저장"""
        print("온도 데이터 업데이트 시작...")
        updated_count = 0
        error_count = 0
        
        for collection_name in self.collections:
            collection = self.db[collection_name]
            print(f"{collection_name} 온도 데이터 업데이트 중...")
            
            for doc in collection.find():
                code = doc.get('code', 0)
                if code == 0:
                    continue
                    
                try:
                    params = {
                        'tm2': '0',     
                        'stn': code,
                        'disp':'0',         
                        'authKey': self.authKey,
                        'inf': 'AWS'
                    }
                    url = 'https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-aws2_min'
                    
                    response = requests.get(url, params=params, verify=True, timeout=5)
                    
                    if response.status_code == 200:
                        lines = response.text.splitlines()
                        data_lines = [line for line in lines if line.strip() and not line.startswith("#")]
                        
                        if data_lines:
                            columns = data_lines[0].split()
                            if len(columns) > 8 and columns[8].replace('.', '').replace('-', '').isdigit():
                                temp = float(columns[8])
                                
                                collection.update_one(
                                    {"_id": doc["_id"]},
                                    {
                                        "$set": {
                                            "temperature": temp,
                                            "temp_updated_at": datetime.datetime.now()
                                        }
                                    }
                                )
                                updated_count += 1
                    
                    # API 호출 간격 조절
                    time.sleep(0.1)
                                
                except requests.exceptions.Timeout:
                    print(f"Timeout - {collection_name} {doc.get('name', 'Unknown')}")
                    error_count += 1
                    continue
                except Exception as e:
                    print(f"온도 데이터 업데이트 실패 - {collection_name} {doc.get('name', 'Unknown')}: {str(e)}")
                    error_count += 1
                    continue
        
        print(f"온도 데이터 업데이트 완료: {updated_count}개 성공, {error_count}개 실패")
        return updated_count

    def update_temperature_data_by_region(self, province, region_name=None):
        """특정 지역의 온도 데이터만 업데이트"""
        collection = self.db[province]
        query = {"name": region_name} if region_name else {}
        
        updated_count = 0
        for doc in collection.find(query):
            code = doc.get('code', 0)
            if code == 0:
                continue
                
            try:
                params = {
                    'tm2': '0',     
                    'stn': code,
                    'disp':'0',         
                    'authKey': self.authKey,
                    'inf': 'AWS'
                }
                url = 'https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-aws2_min'
                response = requests.get(url, params=params, verify=True, timeout=5)
                
                if response.status_code == 200:
                    lines = response.text.splitlines()
                    data_lines = [line for line in lines if line.strip() and not line.startswith("#")]
                    
                    if data_lines:
                        columns = data_lines[0].split()
                        if len(columns) > 8 and columns[8].replace('.', '').replace('-', '').isdigit():
                            temp = float(columns[8])
                            
                            collection.update_one(
                                {"_id": doc["_id"]},
                                {
                                    "$set": {
                                        "temperature": temp,
                                        "temp_updated_at": datetime.datetime.now()
                                    }
                                }
                            )
                            updated_count += 1
                            
            except Exception as e:
                print(f"온도 데이터 업데이트 실패 - {province} {doc.get('name', 'Unknown')}: {str(e)}")
                continue
        
        return updated_count
    
    def should_update_temperature_data(self):
        """온도 데이터 업데이트가 필요한지 확인"""
        # 마지막 업데이트 시간 확인
        last_update = self.db.system_info.find_one({"type": "last_temp_update"})
    
        if not last_update:
           return True
    
        import datetime
        now = datetime.datetime.now()
        last_time = last_update.get('timestamp', datetime.datetime.min)
    
        # 30분 이내에 업데이트된 경우 스킵
        if (now - last_time).total_seconds() < 1800:  # 30분 = 18000
            print(f"온도 데이터가 최근에 업데이트됨 ({last_time}). 스킵.")
            return False
    
        return True

    def update_temperature_data_smart(self):
        """스마트 온도 데이터 업데이트 (중복 방지)"""
        if not self.should_update_temperature_data():
            return 0
    
        # 업데이트 시작 시점 기록 (다른 요청들이 중복 실행 방지)
        import datetime
        self.db.system_info.update_one(
            {"type": "last_temp_update"},
            {"$set": {"timestamp": datetime.datetime.now(), "status": "updating"}},
            upsert=True
        )
    
        try:
            updated_count = self.update_temperature_data()
        
            # 업데이트 완료 기록
            self.db.system_info.update_one(
                {"type": "last_temp_update"},
                {"$set": {"timestamp": datetime.datetime.now(), "status": "completed"}}
            )
        
            return updated_count
        except Exception as e:
            # 실패 시 상태 초기화
            self.db.system_info.delete_one({"type": "last_temp_update"})
            raise e