import schedule
import time
import threading
from weather_service import WeatherService
from pymongo.mongo_client import MongoClient
import certifi

from dotenv import load_dotenv
import os
load_dotenv()

class BackgroundScheduler:
    def __init__(self):
        uri = os.getenv('MONGODB_URI')
        self.client = MongoClient(uri, tlsCAFile=certifi.where())
        self.weather_service = WeatherService(self.client)
        
    def update_temperature_job(self):
        """백그라운드에서 실행되는 온도 업데이트 작업"""
        print("백그라운드 온도 데이터 업데이트 시작...")
        try:
            updated_count = self.weather_service.update_temperature_data()
            print(f"백그라운드 온도 업데이트 완료: {updated_count}개 지역")
        except Exception as e:
            print(f"백그라운드 온도 업데이트 실패: {e}")
    
    def start_scheduler(self):
        """스케줄러 시작"""
        # 30분마다 온도 데이터 업데이트
        schedule.every(30).minutes.do(self.update_temperature_job)
        
        # 첫 실행 (서버 시작 5분 후)
        schedule.every().minute.do(self.update_temperature_job).tag('first_run')
        
        def run_scheduler():
            first_run_done = False
            while True:
                schedule.run_pending()
                
                # 첫 실행 후 태그 제거
                if not first_run_done and schedule.get_jobs('first_run'):
                    if any(job.last_run for job in schedule.get_jobs('first_run')):
                        schedule.clear('first_run')
                        first_run_done = True
                        print("첫 실행 완료, 정기 스케줄로 전환")
                
                time.sleep(60)  # 1분마다 체크
        
        # 백그라운드 스레드로 실행
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        print("백그라운드 온도 업데이트 스케줄러 시작됨 (30분 간격)")