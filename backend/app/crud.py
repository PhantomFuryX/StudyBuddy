from .deps import db
from bson import ObjectId
from datetime import datetime, timedelta, date
import random
from typing import Optional, List, Dict
from .models import Badge, BadgeType

QUESTIONS_COLL = db.questions
PROGRESS_COLL = db.progress
ATTEMPTS_COLL = db.attempts
USERS_COLL = db.users
TASKS_COLL = db.tasks
DAILY_LOGS_COLL = db.daily_logs
FACTS_COLL = db.did_you_know
QUOTES_COLL = db.motivational_quotes
EXAMS_COLL = db.exams
UPLOADS_COLL = db.upload_jobs

BADGE_DEFINITIONS = {
    BadgeType.FIRST_QUIZ: {"name": "First Steps", "description": "Completed your first quiz!", "icon": "🎯"},
    BadgeType.STREAK_7: {"name": "Week Warrior", "description": "7 day streak!", "icon": "🔥"},
    BadgeType.STREAK_30: {"name": "Monthly Master", "description": "30 day streak!", "icon": "💪"},
    BadgeType.STREAK_100: {"name": "Unstoppable", "description": "100 day streak!", "icon": "👑"},
    BadgeType.QUESTIONS_100: {"name": "Century", "description": "Answered 100 questions!", "icon": "💯"},
    BadgeType.QUESTIONS_500: {"name": "Scholar", "description": "Answered 500 questions!", "icon": "📚"},
    BadgeType.QUESTIONS_1000: {"name": "Expert", "description": "Answered 1000 questions!", "icon": "🏆"},
    BadgeType.PERFECT_QUIZ: {"name": "Perfectionist", "description": "Got 100% in a quiz!", "icon": "⭐"},
    BadgeType.EARLY_BIRD: {"name": "Early Bird", "description": "Studied before 7 AM!", "icon": "🌅"},
    BadgeType.NIGHT_OWL: {"name": "Night Owl", "description": "Studied after 11 PM!", "icon": "🦉"},
    BadgeType.CONSISTENCY_KING: {"name": "Consistency King", "description": "Studied every day for 2 weeks!", "icon": "👸"},
}

async def create_user(user_data: dict) -> str:
    result = await USERS_COLL.insert_one(user_data)
    await init_user_progress(str(result.inserted_id))
    return str(result.inserted_id)

async def get_user_by_email(email: str):
    return await USERS_COLL.find_one({"email": email})

async def get_user_by_id(user_id: str):
    return await USERS_COLL.find_one({"_id": ObjectId(user_id)})

async def update_user(user_id: str, data: dict):
    await USERS_COLL.update_one({"_id": ObjectId(user_id)}, {"$set": data})

async def init_user_progress(user_id: str):
    existing = await PROGRESS_COLL.find_one({"user_id": user_id})
    if not existing:
        await PROGRESS_COLL.insert_one({
            "user_id": user_id,
            "spaced_meta": {},
            "streak": 0,
            "longest_streak": 0,
            "points": 0,
            "level": 1,
            "total_questions_answered": 0,
            "correct_answers": 0,
            "badges": [],
            "last_active_date": None,
            "category_stats": {},
            "created_at": datetime.utcnow()
        })

async def insert_question(q: dict):
    res = await QUESTIONS_COLL.insert_one(q)
    return str(res.inserted_id)

async def bulk_insert_questions(questions: List[dict]) -> List[str]:
    result = await QUESTIONS_COLL.insert_many(questions)
    return [str(id) for id in result.inserted_ids]

async def get_question(qid: str):
    return await QUESTIONS_COLL.find_one({"_id": ObjectId(qid)})

async def fetch_questions(category: str = None, exclude_ids: list = None, limit: int = 100, difficulty: int = None):
    q = {}
    if category:
        q["category"] = category
    if exclude_ids:
        q["_id"] = {"$nin": [ObjectId(i) for i in exclude_ids]}
    if difficulty:
        q["difficulty"] = {"$lte": difficulty}
    cursor = QUESTIONS_COLL.find(q).limit(limit)
    return await cursor.to_list(length=limit)

async def get_spaced_due(user_id: str, limit: int = 10):
    p = await PROGRESS_COLL.find_one({"user_id": user_id}) or {}
    spaced_meta = p.get("spaced_meta", {})
    due = []
    today = datetime.utcnow().date()
    for qid, meta in spaced_meta.items():
        due_date = meta.get("due_date")
        if not due_date:
            continue
        dd = datetime.fromisoformat(due_date).date() if isinstance(due_date, str) else due_date
        if dd <= today:
            due.append(qid)
    results = []
    for qid in due[:limit]:
        try:
            qdoc = await QUESTIONS_COLL.find_one({"_id": ObjectId(qid)})
            if qdoc:
                qdoc["id"] = str(qdoc["_id"])
                results.append(qdoc)
        except:
            pass
    return results

async def get_user_progress(user_id: str) -> dict:
    prog = await PROGRESS_COLL.find_one({"user_id": user_id})
    if not prog:
        await init_user_progress(user_id)
        prog = await PROGRESS_COLL.find_one({"user_id": user_id})
    return prog

async def update_streak(user_id: str, prog: dict) -> tuple:
    today = datetime.utcnow().date().isoformat()
    yesterday = (datetime.utcnow().date() - timedelta(days=1)).isoformat()
    last_active = prog.get("last_active_date")
    
    new_badges = []
    
    if last_active == today:
        return prog["streak"], new_badges
    elif last_active == yesterday:
        prog["streak"] += 1
    elif last_active is None or last_active != today:
        prog["streak"] = 1
    
    if prog["streak"] > prog.get("longest_streak", 0):
        prog["longest_streak"] = prog["streak"]
    
    prog["last_active_date"] = today
    
    streak_badges = {7: BadgeType.STREAK_7, 30: BadgeType.STREAK_30, 100: BadgeType.STREAK_100}
    if prog["streak"] in streak_badges:
        badge_type = streak_badges[prog["streak"]]
        existing_badges = [b["type"] for b in prog.get("badges", [])]
        if badge_type.value not in existing_badges:
            badge_def = BADGE_DEFINITIONS[badge_type]
            new_badge = {
                "type": badge_type.value,
                "name": badge_def["name"],
                "description": badge_def["description"],
                "icon": badge_def["icon"],
                "earned_at": datetime.utcnow().isoformat()
            }
            prog.setdefault("badges", []).append(new_badge)
            new_badges.append(new_badge)
    
    return prog["streak"], new_badges

def calculate_level(points: int) -> int:
    if points < 100:
        return 1
    elif points < 300:
        return 2
    elif points < 600:
        return 3
    elif points < 1000:
        return 4
    elif points < 1500:
        return 5
    elif points < 2500:
        return 6
    elif points < 4000:
        return 7
    elif points < 6000:
        return 8
    elif points < 9000:
        return 9
    else:
        return 10 + (points - 9000) // 3000

async def record_attempt(attempt: dict) -> dict:
    await ATTEMPTS_COLL.insert_one(attempt)
    prog = await PROGRESS_COLL.find_one({"user_id": attempt["user_id"]})
    if not prog:
        await init_user_progress(attempt["user_id"])
        prog = await PROGRESS_COLL.find_one({"user_id": attempt["user_id"]})
    
    spaced = prog.get("spaced_meta", {})
    qid = attempt["question_id"]
    correct = attempt["correct"]
    category = attempt.get("category", "unknown")
    
    meta = spaced.get(qid, {"ef": 2.5, "interval_days": 0, "repetitions": 0})
    
    if correct:
        meta["repetitions"] += 1
        if meta["repetitions"] == 1:
            meta["interval_days"] = 1
        elif meta["repetitions"] == 2:
            meta["interval_days"] = 6
        else:
            meta["interval_days"] = int(round(meta["interval_days"] * meta["ef"]))
        meta["ef"] = max(1.3, meta["ef"] + 0.1)
    else:
        meta["repetitions"] = 0
        meta["interval_days"] = 1
        meta["ef"] = max(1.3, meta["ef"] - 0.2)
    
    next_due = (datetime.utcnow() + timedelta(days=meta["interval_days"])).date().isoformat()
    meta["due_date"] = next_due
    spaced[qid] = meta
    prog["spaced_meta"] = spaced
    
    points_earned = 10 if correct else 2
    prog["points"] = prog.get("points", 0) + points_earned
    prog["total_questions_answered"] = prog.get("total_questions_answered", 0) + 1
    if correct:
        prog["correct_answers"] = prog.get("correct_answers", 0) + 1
    
    prog["level"] = calculate_level(prog["points"])
    
    cat_stats = prog.get("category_stats", {})
    if category not in cat_stats:
        cat_stats[category] = {"total": 0, "correct": 0}
    cat_stats[category]["total"] += 1
    if correct:
        cat_stats[category]["correct"] += 1
    prog["category_stats"] = cat_stats
    
    streak, new_badges = await update_streak(attempt["user_id"], prog)
    
    question_milestones = {100: BadgeType.QUESTIONS_100, 500: BadgeType.QUESTIONS_500, 1000: BadgeType.QUESTIONS_1000}
    total_q = prog["total_questions_answered"]
    if total_q in question_milestones:
        badge_type = question_milestones[total_q]
        existing = [b["type"] for b in prog.get("badges", [])]
        if badge_type.value not in existing:
            badge_def = BADGE_DEFINITIONS[badge_type]
            new_badge = {
                "type": badge_type.value,
                "name": badge_def["name"],
                "description": badge_def["description"],
                "icon": badge_def["icon"],
                "earned_at": datetime.utcnow().isoformat()
            }
            prog.setdefault("badges", []).append(new_badge)
            new_badges.append(new_badge)
    
    await PROGRESS_COLL.update_one({"user_id": attempt["user_id"]}, {"$set": prog}, upsert=True)
    
    await update_daily_log(attempt["user_id"], correct, attempt.get("time_ms", 0), category)
    
    return {
        "points_earned": points_earned,
        "streak": streak,
        "new_badge": new_badges[0] if new_badges else None,
        "total_points": prog["points"],
        "level": prog["level"]
    }

async def update_daily_log(user_id: str, correct: bool, time_ms: int, category: str):
    today = datetime.utcnow().date().isoformat()
    log = await DAILY_LOGS_COLL.find_one({"user_id": user_id, "date": today})
    
    if not log:
        log = {
            "user_id": user_id,
            "date": today,
            "questions_answered": 0,
            "correct_answers": 0,
            "time_spent_minutes": 0,
            "categories_covered": []
        }
    else:
        # Ensure backward compatibility with older documents
        log.setdefault("questions_answered", 0)
        log.setdefault("correct_answers", 0)
        log.setdefault("time_spent_minutes", 0)
        log.setdefault("categories_covered", [])
    
    log["questions_answered"] += 1
    if correct:
        log["correct_answers"] += 1
    log["time_spent_minutes"] += time_ms // 60000
    if category and category not in log["categories_covered"]:
        log["categories_covered"].append(category)
    
    await DAILY_LOGS_COLL.update_one(
        {"user_id": user_id, "date": today},
        {"$set": log},
        upsert=True
    )

async def get_daily_stats(user_id: str, date_str: str = None) -> dict:
    if not date_str:
        date_str = datetime.utcnow().date().isoformat()
    log = await DAILY_LOGS_COLL.find_one({"user_id": user_id, "date": date_str})
    return log or {"questions_answered": 0, "correct_answers": 0, "time_spent_minutes": 0, "categories_covered": []}

async def get_weekly_stats(user_id: str) -> List[dict]:
    today = datetime.utcnow().date()
    stats = []
    for i in range(7):
        date_str = (today - timedelta(days=6-i)).isoformat()
        log = await get_daily_stats(user_id, date_str)
        stats.append({
            "date": date_str,
            "day": (today - timedelta(days=6-i)).strftime("%a"),
            "questions": log.get("questions_answered", 0),
            "correct": log.get("correct_answers", 0)
        })
    return stats

async def create_task(user_id: str, task_data: dict) -> str:
    task_data["user_id"] = user_id
    task_data["created_at"] = datetime.utcnow()
    task_data["status"] = "pending"
    result = await TASKS_COLL.insert_one(task_data)
    return str(result.inserted_id)

async def get_user_tasks(user_id: str, status: str = None, limit: int = 50) -> List[dict]:
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    cursor = TASKS_COLL.find(query).sort("due_date", 1).limit(limit)
    tasks = await cursor.to_list(length=limit)
    for t in tasks:
        t["id"] = str(t["_id"])
        t.pop("_id", None)
        # Normalize potential legacy fields to JSON-safe types
        if not isinstance(t.get("user_id"), str):
            try:
                t["user_id"] = str(t.get("user_id"))
            except Exception:
                t["user_id"] = user_id
    return tasks

async def update_task(task_id: str, user_id: str, updates: dict) -> bool:
    updates["updated_at"] = datetime.utcnow()
    if updates.get("status") == "completed":
        updates["completed_at"] = datetime.utcnow()
        today = datetime.utcnow().date().isoformat()
        await DAILY_LOGS_COLL.update_one(
            {"user_id": user_id, "date": today},
            {
                "$inc": {"tasks_completed": 1},
                "$setOnInsert": {
                    "questions_answered": 0,
                    "correct_answers": 0,
                    "time_spent_minutes": 0,
                    "categories_covered": []
                }
            },
            upsert=True
        )
    result = await TASKS_COLL.update_one(
        {"_id": ObjectId(task_id), "user_id": user_id},
        {"$set": updates}
    )
    return result.modified_count > 0

async def delete_task(task_id: str, user_id: str) -> bool:
    result = await TASKS_COLL.delete_one({"_id": ObjectId(task_id), "user_id": user_id})
    return result.deleted_count > 0

async def get_random_did_you_know(category: str = None) -> dict:
    pipeline = [{"$sample": {"size": 1}}]
    if category:
        pipeline.insert(0, {"$match": {"category": category}})
    cursor = FACTS_COLL.aggregate(pipeline)
    facts = await cursor.to_list(length=1)
    if facts:
        fact = facts[0]
        fact["id"] = str(fact["_id"])
        fact.pop("_id", None)
        return fact
    return {"fact": "India has 28 states and 8 Union Territories!", "category": "gk"}

async def get_motivational_quote(situation: str = None) -> dict:
    pipeline = [{"$sample": {"size": 1}}]
    if situation:
        pipeline.insert(0, {"$match": {"for_situation": situation}})
    cursor = QUOTES_COLL.aggregate(pipeline)
    quotes = await cursor.to_list(length=1)
    if quotes:
        quote = quotes[0]
        quote["id"] = str(quote["_id"])
        quote.pop("_id", None)
        return quote
    
    default_quotes = [
        {"quote": "Success is not final, failure is not fatal: It is the courage to continue that counts.", "author": "Winston Churchill"},
        {"quote": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
        {"quote": "Believe you can and you're halfway there.", "author": "Theodore Roosevelt"},
        {"quote": "Your time is limited, don't waste it living someone else's life.", "author": "Steve Jobs"},
        {"quote": "The future belongs to those who believe in the beauty of their dreams.", "author": "Eleanor Roosevelt"},
        {"quote": "Hard work beats talent when talent doesn't work hard.", "author": "Tim Notke"},
        {"quote": "Discipline is the bridge between goals and accomplishment.", "author": "Jim Rohn"},
        {"quote": "छोटे छोटे कदम भी बड़ी मंज़िल तक पहुँचाते हैं।", "author": "Hindi Proverb"},
    ]
    return random.choice(default_quotes)

async def update_study_preferences(user_id: str, preferences: dict):
    prog = await get_user_progress(user_id)
    prog["study_preferences"] = preferences
    await PROGRESS_COLL.update_one({"user_id": user_id}, {"$set": prog}, upsert=True)

async def get_questions_count() -> dict:
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    cursor = QUESTIONS_COLL.aggregate(pipeline)
    results = await cursor.to_list(length=100)
    return {r["_id"]: r["count"] for r in results}

async def search_questions(query: str, category: str = None, limit: int = 20) -> List[dict]:
    search_filter = {"$text": {"$search": query}}
    if category:
        search_filter["category"] = category
    try:
        cursor = QUESTIONS_COLL.find(search_filter).limit(limit)
    except:
        search_filter = {"question": {"$regex": query, "$options": "i"}}
        if category:
            search_filter["category"] = category
        cursor = QUESTIONS_COLL.find(search_filter).limit(limit)
    
    questions = await cursor.to_list(length=limit)
    for q in questions:
        q["id"] = str(q["_id"])
        q.pop("_id", None)
    return questions

# Upload jobs
async def create_upload_job(user_id: str, filename: str) -> str:
    doc = {
        "user_id": user_id,
        "filename": filename,
        "status": "queued",  # queued|processing|done|error
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "extracted": 0,
        "added": 0,
        "message": ""
    }
    res = await UPLOADS_COLL.insert_one(doc)
    return str(res.inserted_id)

async def update_upload_job(job_id: str, updates: dict):
    updates["updated_at"] = datetime.utcnow()
    await UPLOADS_COLL.update_one({"_id": ObjectId(job_id)}, {"$set": updates})

async def get_upload_job(job_id: str) -> dict | None:
    doc = await UPLOADS_COLL.find_one({"_id": ObjectId(job_id)})
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc

async def get_latest_upload_job(user_id: str) -> dict | None:
    doc = await UPLOADS_COLL.find({"user_id": user_id}).sort("created_at", -1).limit(1).to_list(length=1)
    if not doc:
        return None
    d = doc[0]
    d["id"] = str(d["_id"])
    d.pop("_id", None)
    return d

# Exams
async def create_exam(user_id: str, exam: dict) -> str:
    exam_doc = {
        "user_id": user_id,
        "name": exam.get("name"),
        "date": exam.get("date"),  # ISO date string YYYY-MM-DD
        "notes": exam.get("notes"),
        "created_at": datetime.utcnow()
    }
    res = await EXAMS_COLL.insert_one(exam_doc)
    return str(res.inserted_id)

async def list_exams(user_id: str) -> List[dict]:
    cursor = EXAMS_COLL.find({"user_id": user_id}).sort("date", 1)
    items = await cursor.to_list(length=100)
    for e in items:
        e["id"] = str(e["_id"])
        e.pop("_id", None)
        # Normalize legacy user_id stored as ObjectId
        if not isinstance(e.get("user_id"), str):
            try:
                e["user_id"] = str(e.get("user_id"))
            except Exception:
                e["user_id"] = user_id
    return items

async def get_upcoming_exam(user_id: str) -> Optional[dict]:
    today = datetime.utcnow().date().isoformat()
    cursor = EXAMS_COLL.find({"user_id": user_id, "date": {"$gte": today}}).sort("date", 1).limit(1)
    items = await cursor.to_list(length=1)
    if not items:
        return None
    e = items[0]
    e["id"] = str(e["_id"])
    e.pop("_id", None)
    if not isinstance(e.get("user_id"), str):
        try:
            e["user_id"] = str(e.get("user_id"))
        except Exception:
            e["user_id"] = user_id
    # compute days_left
    try:
        exam_date = datetime.fromisoformat(e["date"]).date()
    except Exception:
        return e
    days_left = (exam_date - datetime.utcnow().date()).days
    e["days_left"] = days_left
    return e
