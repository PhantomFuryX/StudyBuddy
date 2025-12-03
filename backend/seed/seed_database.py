#!/usr/bin/env python3
"""
Seed script to populate the database with initial data.
Run this after setting up MongoDB.

Usage: python seed_database.py
"""

import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "studybuddy")

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    seed_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Seed questions
    questions_file = os.path.join(seed_dir, "sample_questions.json")
    if os.path.exists(questions_file):
        with open(questions_file, "r", encoding="utf-8") as f:
            questions = json.load(f)
        
        # Check if already seeded
        existing = await db.questions.count_documents({})
        if existing == 0:
            result = await db.questions.insert_many(questions)
            print(f"✅ Inserted {len(result.inserted_ids)} questions")
        else:
            print(f"ℹ️  Questions already exist ({existing} found), skipping...")
    
    # Seed motivational quotes
    quotes_file = os.path.join(seed_dir, "motivational_quotes.json")
    if os.path.exists(quotes_file):
        with open(quotes_file, "r", encoding="utf-8") as f:
            quotes = json.load(f)
        
        existing = await db.motivational_quotes.count_documents({})
        if existing == 0:
            result = await db.motivational_quotes.insert_many(quotes)
            print(f"✅ Inserted {len(result.inserted_ids)} motivational quotes")
        else:
            print(f"ℹ️  Quotes already exist ({existing} found), skipping...")
    
    # Seed Did You Know facts
    facts_file = os.path.join(seed_dir, "did_you_know.json")
    if os.path.exists(facts_file):
        with open(facts_file, "r", encoding="utf-8") as f:
            facts = json.load(f)
        
        existing = await db.did_you_know.count_documents({})
        if existing == 0:
            result = await db.did_you_know.insert_many(facts)
            print(f"✅ Inserted {len(result.inserted_ids)} Did You Know facts")
        else:
            print(f"ℹ️  Facts already exist ({existing} found), skipping...")
    
    # Create indexes
    await db.questions.create_index([("question", "text")])
    await db.questions.create_index("category")
    await db.users.create_index("email", unique=True)
    await db.progress.create_index("user_id")
    await db.attempts.create_index([("user_id", 1), ("date", -1)])
    await db.tasks.create_index([("user_id", 1), ("status", 1)])
    await db.daily_logs.create_index([("user_id", 1), ("date", 1)])
    
    print("✅ Database indexes created")
    
    # Print summary
    q_count = await db.questions.count_documents({})
    quotes_count = await db.motivational_quotes.count_documents({})
    facts_count = await db.did_you_know.count_documents({})
    
    print("\n📊 Database Summary:")
    print(f"   Questions: {q_count}")
    print(f"   Quotes: {quotes_count}")
    print(f"   Facts: {facts_count}")
    
    client.close()
    print("\n🚀 Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_database())
