import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "studybuddy")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production-123!")
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
