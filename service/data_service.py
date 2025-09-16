import random

class DataService:
    def __init__(self, client):
        self.client = client
        self.db = client.korea_regions_db
        self.collections = ['서울특별시', '부산광역시', '강원도', '대구광역시', '인천광역시', 
                           '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도',
                           '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도']
        
    # 계산 함수들
    def _get_feeling_arrays_from_doc(self, doc):
        """문서에서 feeling 배열들 추출"""
        return (
            doc.get('hot', [0,0,0,0,0,0]),
            doc.get('normal', [0,0,0,0,0,0]),
            doc.get('cold', [0,0,0,0,0,0])
        )
    
    def _calculate_dominant_feeling(self, hot_array, normal_array, cold_array):
        """가장 많이 투표된 feeling 계산"""
        max_votes = max(hot_array[0], normal_array[0], cold_array[0])
        if hot_array[0] == max_votes:
            return 'hot', hot_array
        elif cold_array[0] == max_votes:
            return 'cold', cold_array
        else:
            return 'normal', normal_array
        
    def _calculate_total_votes(self, hot_array, normal_array, cold_array):
        """각 feeling의 총 투표수 리턴"""
        return {
            'hot' : hot_array[0],
            'normal' : normal_array[0],
            'cold' : cold_array[0]
        }
    
    def _analyze_region_data(self, doc):
        """시군구의 투표 데이터 처리"""
        hot_array, normal_array, cold_array = self._get_feeling_arrays_from_doc(doc)
        dominant_feeling, dominant_array = self._calculate_dominant_feeling(hot_array, normal_array, cold_array)
        total_votes = self._calculate_total_votes(hot_array, normal_array, cold_array)
        
        return {
            'hot_array': hot_array,
            'normal_array': normal_array,
            'cold_array': cold_array,
            'dominant_feeling': dominant_feeling,   # 시군구의 우세한 feeling
            'dominant_array': dominant_array,       
            'total_votes': total_votes      # 총 투표수
        }
    
    def _aggregate_province_totals(self, collection):
        """광역시/도별 총 투표수 집계"""
        total_hot = total_normal = total_cold = 0
        region_details = {}
        
        for doc in collection.find():
            processed = self._analyze_region_data(doc)
            
            # 광역시/도 총합 누적
            total_hot += processed['total_votes']['hot']
            total_normal += processed['total_votes']['normal']
            total_cold += processed['total_votes']['cold']
            
            # 시군구별 상세 데이터 저장 (dominant feeling만)
            region_name = doc['name']
            if max(processed['total_votes'].values()) > 0:
                region_details[region_name] = processed['dominant_array']
        
        return {
            'totals': {'hot': total_hot, 'normal': total_normal, 'cold': total_cold},
            'region_details': region_details
        }

    # 호출 메서드
    def get_regions_by_province(self, province):
        """특정 광역시/도의 시군구 목록 반환"""
        a = list(self.db[province].find({}, {"_id": 0, "name": 1}))
        names = [doc["name"] for doc in a]
        return sorted(names)

    def save_vote_result(self, feeling, do, si, detail):
        """투표 결과 저장 및 선택된 시군구 온도 데이터 반환"""
        self.db[do].update_one({"name": si}, {"$inc": {f"{feeling}.{0}": 1}})
        self.db[do].update_one({"name": si}, {'$inc': {f"{feeling}.{detail}": 1}})

        # DB에서 온도 데이터 가져오기 (캐시된 데이터 사용)
        region_doc = self.db[do].find_one({"name": si})
        temp = region_doc.get('temperature', None) if region_doc else None
        
        # 처리된 데이터 가져오기
        if region_doc:
            processed = self._analyze_region_data(region_doc)
            dominant_feeling = processed['dominant_feeling']
            dominant_array = processed['dominant_array']
        else:
            dominant_feeling = "normal"
            dominant_array = [0, 0, 0, 0, 0, 0]

        return {
            "year": "2025",
            "지역": si,
            "C": temp,
            "feeling": dominant_feeling,
            "detailArray": dominant_array
        }

    def get_weather_data(self, level, province=None):
        """지도 시각화용 날씨 데이터 조회"""
        weather_stats = {}
        array = {}
    
        # 통합할 도시들 정의
        MERGE_CITIES = ['용인', '수원', '성남', '청주', '천안', '전주', "창원", "안양", "고양", "안산"]
    
        def get_city_name_for_district(district_name):
            """구 이름에서 시 이름 추출"""
            for city in MERGE_CITIES:
                if city in district_name:
                    return city + '시'
            return district_name
    
        def merge_city_data(weather_stats, detail_arrays):
            """구 데이터를 시 단위로 통합"""
            merged_weather = {}
            merged_arrays = {}
            city_votes = {}
            city_details = {}
        
            # 1단계: 구 데이터를 시별로 그룹화
            for region_name, feeling in weather_stats.items():
                city_name = get_city_name_for_district(region_name)
            
                if city_name not in city_votes:
                    city_votes[city_name] = {'hot': 0, 'normal': 0, 'cold': 0}
                    city_details[city_name] = [0, 0, 0, 0, 0, 0]
            
                # 투표수 누적
                city_votes[city_name][feeling] += 1
            
                # detail 배열 누적 (해당 지역의 detail 배열이 있는 경우)
                if region_name in detail_arrays:
                    region_detail = detail_arrays[region_name]
                    for i in range(4):
                        city_details[city_name][i] += region_detail[i] if i < len(region_detail) else 0
        
            # 2단계: 각 시의 우세한 feeling 결정
            for city_name, votes in city_votes.items():
                if sum(votes.values()) > 0:
                    # 가장 많은 투표를 받은 feeling 선택
                    dominant_feeling = max(votes, key=votes.get)
                    merged_weather[city_name] = dominant_feeling
                    merged_arrays[city_name] = city_details[city_name]
                else:
                    merged_weather[city_name] = 'normal'
                    merged_arrays[city_name] = [0, 0, 0, 0, 0, 0]
        
            return merged_weather, merged_arrays
    
        if level == 'provinces':
            for collection_name in self.collections:
                collection = self.db[collection_name]
                aggregated = self._aggregate_province_totals(collection)

                # 광역시/도별 우세한 feeling 결정
                totals = aggregated['totals']
                max_value = max(totals.values())
                if max_value > 0:
                    if totals['hot'] == max_value:
                        weather_stats[collection_name] = 'hot'
                    elif totals['cold'] == max_value:
                        weather_stats[collection_name] = 'cold'
                    else:
                        weather_stats[collection_name] = 'normal'
                else:
                    weather_stats[collection_name] = 'normal'
            
                array.update(aggregated['region_details'])
    
        else:  # municipalities
            for collection_name in self.collections:
                collection = self.db[collection_name]

                # 서울특별시는 구별로 나누지 않고 전체를 하나로 처리
                if collection_name == "서울특별시":
                    aggregated = self._aggregate_province_totals(collection)
                    totals = aggregated['totals']
                    max_value = max(totals.values())
                    if max_value > 0:
                        if totals['hot'] == max_value:
                            weather_stats["서울특별시"] = 'hot'
                        elif totals['cold'] == max_value:
                            weather_stats["서울특별시"] = 'cold'
                        else:
                            weather_stats["서울특별시"] = 'normal'
                        # 서울 전체의 집계된 데이터 사용
                        array["서울특별시"] = [sum(totals.values()), 0, 0, 0]
                    else:
                        weather_stats["서울특별시"] = 'normal'
                        array["서울특별시"] = [0, 0, 0, 0, 0, 0]

                else:
                    for doc in collection.find():
                        processed = self._analyze_region_data(doc)
                        region_name = doc['name']

                        if sum(processed['total_votes'].values()) > 0:
                            weather_stats[region_name] = processed['dominant_feeling']
                            array[region_name] = processed['dominant_array']
                        else:
                            weather_stats[region_name] = 'normal'
                            array[region_name] = []

            weather_stats, array = merge_city_data(weather_stats, array)

        return weather_stats, array
    
    def get_region_info(self, province, region_name):
        """특정 지역의 상세 정보 반환 (온도, 투표 데이터 등)"""
        collection = self.db[province]
        region_doc = collection.find_one({"name": region_name})
    
        if not region_doc:
            return {"error": "지역을 찾을 수 없습니다"}
    
        processed = self._analyze_region_data(region_doc)
    
        return {
            "feeling": processed['dominant_feeling'],
            "detailArray": processed['dominant_array'],
            "temperature": region_doc.get('temperature', None)
        }

    def generate_test_data(self):
        """테스트용 임의 데이터 생성"""
        updated_count = 0
        
        for collection_name in self.collections:
            collection = self.db[collection_name]
            
            for doc in collection.find():
                hot_detail = [random.randint(0, 20) for _ in range(5)]
                normal_detail = [random.randint(0, 20) for _ in range(5)]
                cold_detail = [random.randint(0, 20) for _ in range(5)]
                
                hot_votes = [sum(hot_detail)] + hot_detail
                normal_votes = [sum(normal_detail)] + normal_detail  
                cold_votes = [sum(cold_detail)] + cold_detail
                
                collection.update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "hot": hot_votes,
                            "normal": normal_votes,
                            "cold": cold_votes
                        }
                    }
                )
                updated_count += 1
        
        return updated_count

    def get_raw_stats(self, province):
        """특정 광역시/도의 원시 통계 데이터 반환"""
        collection = self.db[province]
        aggregated = self._aggregate_province_totals(collection)

        return aggregated['totals']

    def get_ranking_data(self):
        """DB에 저장된 데이터로 랭킹 계산"""
        total_votes = {'hot': 0, 'normal': 0, 'cold': 0}
        all_regions = []
        
        for collection_name in self.collections:
            collection = self.db[collection_name]
            for doc in collection.find():
                processed = self._analyze_region_data(doc)

                # 전체 투표수 누적
                for feeling, count in processed['total_votes'].items():
                    total_votes[feeling] += count
                
                # 지역별 데이터 수집
                most_voted_feeling = max(processed['total_votes'], key=processed['total_votes'].get)
                votes_for_feeling = processed['total_votes'][most_voted_feeling]

                all_regions.append({
                    'province': collection_name,
                    'region': doc['name'],
                    'votes': votes_for_feeling,
                    'temp': doc.get('temperature', None),
                    'code': doc.get('code', 0)
                })
        
        # 가장 많이 투표된 feeling 찾기
        most_voted_feeling = max(total_votes, key=total_votes.get)

        # 투표수 기준 랭킹
        vote_top_regions = sorted(all_regions, key=lambda x: x['votes'], reverse=True)

        # 온도 기준 랭킹 (온도 데이터가 있는 것만)
        valid_temp_regions = [r for r in all_regions if r['temp'] is not None]

        if most_voted_feeling == 'hot':
            temp_top_regions = sorted(valid_temp_regions, key=lambda x: x['temp'], reverse=True)  # 높은 온도부터
            print("덥다가 1위 - 높은 온도부터 정렬")
        elif most_voted_feeling == 'cold':
            temp_top_regions = sorted(valid_temp_regions, key=lambda x: x['temp'])  # 낮은 온도부터
            print("춥다가 1위 - 낮은 온도부터 정렬")
        else:  # normal
            temp_top_regions = sorted(valid_temp_regions, key=lambda x: abs(x['temp'] - 20))  # 20도에 가까운 순
            print("보통이 1위 - 20도에 가까운 순으로 정렬")
        
        return {
            'mostVotedFeeling': most_voted_feeling,
            'voteTopRegions': vote_top_regions[:20],
            'tempTopRegions': temp_top_regions[:20],
            'totalVotes': total_votes
        }