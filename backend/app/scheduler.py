from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime

scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(daily_maintenance, 'cron', hour=3, minute=0)
    scheduler.start()

async def daily_maintenance():
    print("Daily maintenance run:", datetime.utcnow())
