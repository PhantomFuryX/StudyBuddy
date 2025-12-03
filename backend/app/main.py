from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .schemas import (
    PickQuestionsResponse, AnswerPayload, AnswerResponse,
    UserCreate, UserLogin, TokenResponse, UserResponse,
    StudyPreferencesUpdate, TaskCreate, TaskUpdate,
    ProgressStats, DashboardResponse, BulkQuestionImport,
    FCMTokenUpdate, AIGenerateRequest, PDFUploadResponse,
    CustomQuestionsResponse, QuizConfigRequest, QuizConfigResponse,
    ExamCreate, ExamResponse
)
from . import crud
from .deps import db
from .scheduler import start_scheduler
from .auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user
)
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from bson import ObjectId
import random
from datetime import datetime
from typing import Optional, List
from bson import ObjectId as BsonObjectId

logger = logging.getLogger("uvicorn.error")

# Thread pool for PDF processing (ProcessPoolExecutor doesn't work with ChromaDB's global client)
_PDF_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf_worker")

app = FastAPI(
    title="StudyBuddy API",
    description="API for Study Buddy - Your exam preparation companion",
    version="2.0.0"
)

def to_jsonable(obj):
    if isinstance(obj, BsonObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, list):
        return [to_jsonable(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    return obj

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.on_event("startup")
async def startup_event():
    start_scheduler()
    try:
        await db.questions.create_index([("question", "text")])
        await db.questions.create_index("category")
    except:
        pass

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Serve PDF test tool
@app.get("/pdf-tool")
async def pdf_tool():
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    return FileResponse(os.path.join(static_dir, "pdf_test.html"))

# Serve Question Tool (admin)
@app.get("/question-tool")
async def question_tool():
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    return FileResponse(os.path.join(static_dir, "questionTool.html"))

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await crud.get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    
    user_dict = {
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": get_password_hash(user_data.password),
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    user_id = await crud.create_user(user_dict)
    
    token = create_access_token({"sub": user_id, "email": user_data.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "created_at": datetime.utcnow()
        }
    }

@app.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await crud.get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    
    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "email": user["email"]})
    
    await crud.update_user(user_id, {"last_login": datetime.utcnow()})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "created_at": user["created_at"]
        }
    }

@app.get("/user/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await crud.get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "created_at": user.get("created_at")
    }

@app.put("/user/fcm-token")
async def update_fcm_token(data: FCMTokenUpdate, current_user: dict = Depends(get_current_user)):
    await crud.update_user(current_user["user_id"], {"fcm_token": data.fcm_token})
    return {"status": "updated"}

@app.get("/user/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    user = await crud.get_user_by_id(user_id)
    progress = await crud.get_user_progress(user_id)
    today_stats = await crud.get_daily_stats(user_id)
    pending_tasks = await crud.get_user_tasks(user_id, status="pending", limit=5)
    due_questions = await crud.get_spaced_due(user_id, limit=1)
    
    hour = datetime.utcnow().hour + 5  # IST offset
    if hour < 12:
        greeting = "Good Morning"
    elif hour < 17:
        greeting = "Good Afternoon"
    else:
        greeting = "Good Evening"
    
    quote = await crud.get_motivational_quote()
    fact = await crud.get_random_did_you_know()
    
    prefs = progress.get("study_preferences", {})
    daily_goal = prefs.get("daily_goal_questions", 30)
    
    upcoming = await crud.get_upcoming_exam(user_id)
    return to_jsonable({
        "user_name": user.get("name", "Champion"),
        "greeting": greeting,
        "motivational_quote": quote,
        "streak": progress.get("streak", 0),
        "points": progress.get("points", 0),
        "level": progress.get("level", 1),
        "today_progress": {
            "questions_answered": today_stats.get("questions_answered", 0),
            "correct_answers": today_stats.get("correct_answers", 0),
            "daily_goal": daily_goal,
            "percentage": min(100, int((today_stats.get("questions_answered", 0) / daily_goal) * 100))
        },
        "pending_tasks": pending_tasks,
        "did_you_know": fact,
        "next_review_questions": len(due_questions),
        "upcoming_exam": upcoming
    })

@app.get("/user/stats", response_model=ProgressStats)
async def get_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    progress = await crud.get_user_progress(user_id)
    today_stats = await crud.get_daily_stats(user_id)
    weekly_stats = await crud.get_weekly_stats(user_id)
    
    total_q = progress.get("total_questions_answered", 0)
    correct = progress.get("correct_answers", 0)
    accuracy = (correct / total_q * 100) if total_q > 0 else 0
    
    return to_jsonable({
        "streak": progress.get("streak", 0),
        "longest_streak": progress.get("longest_streak", 0),
        "points": progress.get("points", 0),
        "level": progress.get("level", 1),
        "total_questions": total_q,
        "correct_answers": correct,
        "accuracy_percentage": round(accuracy, 1),
        "badges_count": len(progress.get("badges", [])),
        "today_questions": today_stats.get("questions_answered", 0),
        "today_correct": today_stats.get("correct_answers", 0),
        "weekly_stats": weekly_stats,
        "category_breakdown": progress.get("category_stats", {})
    })

@app.get("/user/badges")
async def get_badges(current_user: dict = Depends(get_current_user)):
    progress = await crud.get_user_progress(current_user["user_id"])
    return to_jsonable({"badges": progress.get("badges", [])})

@app.put("/user/preferences")
async def update_preferences(
    prefs: StudyPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    prefs_dict = prefs.dict(exclude_none=True)
    await crud.update_study_preferences(current_user["user_id"], prefs_dict)
    return to_jsonable({"status": "updated", "preferences": prefs_dict})

@app.get("/user/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)):
    progress = await crud.get_user_progress(current_user["user_id"])
    return to_jsonable(progress.get("study_preferences", {
        "morning_time": "09:00",
        "evening_time": "19:00",
        "daily_goal_questions": 30,
        "preferred_categories": ["reasoning", "gk", "current_affairs"],
        "notification_enabled": True,
        "focus_session_minutes": 25
    }))

@app.get("/questions/daily", response_model=PickQuestionsResponse)
async def daily_questions(current_user: dict = Depends(get_current_user)):
    from .chroma_client import get_questions_from_collection
    
    user_id = current_user["user_id"]
    due = await crud.get_spaced_due(user_id)
    due_ids = [q["id"] for q in due]
    
    # Fetch from MongoDB
    reasoning = await crud.fetch_questions("reasoning", exclude_ids=due_ids, limit=30)
    current = await crud.fetch_questions("current_affairs", limit=30)
    gk = await crud.fetch_questions("gk", limit=30)
    
    reasoning = random.sample(reasoning, min(10, len(reasoning)))
    current = random.sample(current, min(10, len(current)))
    gk = random.sample(gk, min(10, len(gk)))
    
    # Also include custom questions from user's uploaded PDFs
    custom_questions = []
    try:
        custom_questions = get_questions_from_collection(user_id, count=10)
    except Exception as e:
        logger.warning(f"Failed to fetch custom questions: {e}")
    
    final = due + reasoning + current + gk + custom_questions
    random.shuffle(final)
    
    for q in final:
        if "_id" in q:
            q["id"] = str(q["_id"])
            q.pop("_id", None)
    
    quote = await crud.get_motivational_quote()
    fact = await crud.get_random_did_you_know()
    
    return to_jsonable({
        "questions": final,
        "did_you_know": fact,
        "motivational_quote": quote
    })

@app.get("/questions/category/{category}")
async def get_category_questions(
    category: str,
    limit: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    questions = await crud.fetch_questions(category, limit=limit)
    for q in questions:
        q["id"] = str(q["_id"])
        q.pop("_id", None)
    return to_jsonable({"questions": questions})

@app.get("/questions/review")
async def get_review_questions(
    limit: int = Query(default=10, le=30),
    current_user: dict = Depends(get_current_user)
):
    questions = await crud.get_spaced_due(current_user["user_id"], limit=limit)
    return to_jsonable({"questions": questions, "count": len(questions)})

@app.post("/questions/answer", response_model=AnswerResponse)
async def submit_answer(
    payload: AnswerPayload,
    current_user: dict = Depends(get_current_user)
):
    from .chroma_client import get_user_collection
    import ast
    
    q = None
    question_id = payload.question_id
    
    # Try MongoDB first (valid ObjectId is 24 hex chars)
    if len(question_id) == 24:
        try:
            q = await db.questions.find_one({"_id": ObjectId(question_id)})
        except:
            pass
    
    # If not found in MongoDB, try ChromaDB (custom questions)
    if not q:
        try:
            collection = get_user_collection(current_user["user_id"])
            result = collection.get(ids=[question_id], include=["metadatas"])
            if result and result.get("metadatas") and len(result["metadatas"]) > 0:
                meta = result["metadatas"][0]
                try:
                    options = ast.literal_eval(meta.get("options", "[]"))
                except:
                    options = []
                q = {
                    "id": question_id,
                    "question": meta.get("question", ""),
                    "options": options,
                    "answer_index": int(meta.get("answer_index", 0)),
                    "explanation": meta.get("explanation", ""),
                    "category": meta.get("category", "custom"),
                    "source": "custom"
                }
        except Exception as e:
            logger.warning(f"ChromaDB lookup failed: {e}")
    
    if not q:
        raise HTTPException(404, "Question not found")
    
    correct = payload.chosen_index == q.get("answer_index")
    correct_answer = q.get("options", [])[q.get("answer_index", 0)] if q.get("options") else ""
    
    result = await crud.record_attempt({
        "user_id": current_user["user_id"],
        "question_id": question_id,
        "correct": correct,
        "time_ms": payload.time_ms,
        "category": q.get("category")
    })
    
    return to_jsonable({
        "correct": correct,
        "explanation": q.get("explanation", ""),
        "correct_answer": correct_answer,
        "correct_index": q.get("answer_index"),
        "points_earned": result["points_earned"],
        "streak": result["streak"],
        "new_badge": result.get("new_badge")
    })

@app.get("/user/{user_id}/daily_questions", response_model=PickQuestionsResponse)
async def daily_q_legacy(user_id: str):
    due = await crud.get_spaced_due(user_id)
    due_ids = [q["id"] for q in due]

    reasoning = await crud.fetch_questions("reasoning", exclude_ids=due_ids, limit=30)
    current = await crud.fetch_questions("current_affairs", limit=30)
    gk = await crud.fetch_questions("gk", limit=30)

    reasoning = random.sample(reasoning, min(10, len(reasoning)))
    current = random.sample(current, min(10, len(current)))
    gk = random.sample(gk, min(10, len(gk)))

    final = reasoning + current + gk
    random.shuffle(final)

    for q in final:
        q["id"] = str(q["_id"])
        q.pop("_id", None)

    return to_jsonable({"questions": final})

@app.post("/user/answer")
async def post_answer_legacy(payload: AnswerPayload):
    from .chroma_client import get_user_collection
    import ast
    
    q = None
    question_id = payload.question_id
    user_id = payload.user_id or "anonymous"
    
    # Try MongoDB first (valid ObjectId is 24 hex chars)
    if len(question_id) == 24:
        try:
            q = await db.questions.find_one({"_id": ObjectId(question_id)})
        except:
            pass
    
    # If not found in MongoDB, try ChromaDB (custom questions)
    if not q:
        try:
            collection = get_user_collection(user_id)
            result = collection.get(ids=[question_id], include=["metadatas"])
            if result and result.get("metadatas") and len(result["metadatas"]) > 0:
                meta = result["metadatas"][0]
                try:
                    options = ast.literal_eval(meta.get("options", "[]"))
                except:
                    options = []
                q = {
                    "id": question_id,
                    "options": options,
                    "answer_index": int(meta.get("answer_index", 0)),
                    "explanation": meta.get("explanation", ""),
                    "category": meta.get("category", "custom"),
                }
        except:
            pass
    
    if not q:
        raise HTTPException(404)
    
    correct = payload.chosen_index == q.get("answer_index")
    correct_answer = q.get("options", [])[q.get("answer_index", 0)] if q.get("options") else ""

    result = await crud.record_attempt({
        "user_id": user_id,
        "question_id": question_id,
        "correct": correct,
        "time_ms": payload.time_ms,
        "category": q.get("category")
    })

    return to_jsonable({
        "correct": correct,
        "explanation": q.get("explanation", ""),
        "correct_answer": correct_answer,
        "correct_index": q.get("answer_index"),
        "points_earned": result.get("points_earned", 0),
        "streak": result.get("streak", 0)
    })

@app.post("/tasks")
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = await crud.create_task(current_user["user_id"], task.dict())
    return to_jsonable({"id": task_id, "status": "created"})

@app.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    tasks = await crud.get_user_tasks(current_user["user_id"], status=status)
    return to_jsonable({"tasks": tasks})

@app.put("/tasks/{task_id}")
async def update_task(
    task_id: str,
    updates: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    success = await crud.update_task(task_id, current_user["user_id"], updates.dict(exclude_none=True))
    if not success:
        raise HTTPException(404, "Task not found")
    return to_jsonable({"status": "updated"})

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    success = await crud.delete_task(task_id, current_user["user_id"])
    if not success:
        raise HTTPException(404, "Task not found")
    return to_jsonable({"status": "deleted"})

@app.get("/motivation/quote")
async def get_quote(situation: Optional[str] = None):
    quote = await crud.get_motivational_quote(situation)
    return to_jsonable(quote)

@app.get("/motivation/fact")
async def get_fact(category: Optional[str] = None):
    fact = await crud.get_random_did_you_know(category)
    return to_jsonable(fact)

# Exams
@app.post("/exams", response_model=ExamResponse)
async def add_exam(exam: ExamCreate, current_user: dict = Depends(get_current_user)):
    exam_id = await crud.create_exam(current_user["user_id"], exam.dict())
    upcoming = await crud.get_upcoming_exam(current_user["user_id"])
    # Return the created exam with days_left if it matches upcoming
    if upcoming and upcoming.get("id") == exam_id:
        return upcoming
    # Else fetch by listing and pick the one with this id
    exams = await crud.list_exams(current_user["user_id"])
    created = next((e for e in exams if e["id"] == exam_id), None)
    return created

@app.get("/exams", response_model=list[ExamResponse])
async def list_user_exams(current_user: dict = Depends(get_current_user)):
    exams = await crud.list_exams(current_user["user_id"])
    # attach days_left for each
    result = []
    for e in exams:
        try:
            ed = datetime.fromisoformat(e["date"]).date()
            e["days_left"] = (ed - datetime.utcnow().date()).days
        except Exception:
            pass
        result.append(e)
    return result

@app.get("/exams/upcoming", response_model=Optional[ExamResponse])
async def upcoming_exam(current_user: dict = Depends(get_current_user)):
    return await crud.get_upcoming_exam(current_user["user_id"])

@app.post("/tasks/ai-generate")
async def ai_generate_tasks(
    request: AIGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate smart tasks using AI based on user input"""
    from .config import OPENAI_API_KEY
    import openai
    
    # Accept either freeform prompt or structured fields
    user_input = request.prompt
    if not user_input:
        parts = []
        if getattr(request, "topic", None):
            parts.append(f"topic: {request.topic}")
        if getattr(request, "category", None):
            parts.append(f"category: {request.category}")
        if getattr(request, "exam_type", None):
            parts.append(f"exam_type: {request.exam_type}")
        parts.append(f"count: {request.count}")
        parts.append(f"difficulty: {request.difficulty}")
        user_input = ", ".join(parts)
    
    # Default smart tasks that are always helpful
    default_tasks = [
        {"title": "Complete today's 30 question quiz", "priority": "high", "category": "daily"},
        {"title": "Review yesterday's wrong answers", "priority": "medium", "category": "review"},
        {"title": "Read 15 mins of current affairs", "priority": "medium", "category": "current_affairs"},
    ]
    
    if not OPENAI_API_KEY or not user_input:
        # Return smart default tasks if no API key or input
        created_tasks = []
        for task in default_tasks[:3]:
            task_id = await crud.create_task(current_user["user_id"], task)
            created_tasks.append({"id": task_id, **task})
        return to_jsonable({"tasks": created_tasks, "source": "default"})
    
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        system_prompt = """You are a study planner for government exam preparation (SSC, Railway, UPSC).
Based on user input, generate 3-5 specific, actionable study tasks.
Return ONLY a JSON array of tasks with format:
[{"title": "task description", "priority": "high/medium/low", "category": "reasoning/gk/current_affairs/revision"}]
Keep tasks specific and achievable in one day."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create study tasks for: {user_input}"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        import json
        import re
        content = response.choices[0].message.content
        # Extract JSON array from response
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            tasks = json.loads(match.group(0))
        else:
            tasks = default_tasks
            
        # Create tasks in database
        created_tasks = []
        for task in tasks[:5]:
            task_data = {
                "title": task.get("title", "Study task"),
                "priority": task.get("priority", "medium"),
                "category": task.get("category", "general"),
                "ai_generated": True
            }
            task_id = await crud.create_task(current_user["user_id"], task_data)
            created_tasks.append({"id": task_id, **task_data})
            
        return to_jsonable({"tasks": created_tasks, "source": "ai"})
        
    except Exception as e:
        print(f"AI task generation error: {e}")
        # Fallback to default tasks
        created_tasks = []
        for task in default_tasks:
            task_id = await crud.create_task(current_user["user_id"], task)
            created_tasks.append({"id": task_id, **task})
        return to_jsonable({"tasks": created_tasks, "source": "default", "error": str(e)})


@app.get("/tasks/suggestions")
async def get_task_suggestions(current_user: dict = Depends(get_current_user)):
    """Get smart task suggestions based on user's progress"""
    user_id = current_user["user_id"]
    progress = await crud.get_user_progress(user_id)
    today_stats = await crud.get_daily_stats(user_id)
    
    suggestions = []
    
    # Daily quiz reminder
    if today_stats.get("questions_answered", 0) < 30:
        remaining = 30 - today_stats.get("questions_answered", 0)
        suggestions.append({
            "title": f"Complete {remaining} more questions today",
            "priority": "high",
            "category": "daily",
            "reason": "Daily goal incomplete"
        })
    
    # Weak category practice
    cat_stats = progress.get("category_stats", {})
    for cat, stats in cat_stats.items():
        if stats.get("total", 0) > 0:
            accuracy = (stats.get("correct", 0) / stats["total"]) * 100
            if accuracy < 60:
                suggestions.append({
                    "title": f"Practice {cat.replace('_', ' ').title()} - accuracy is {accuracy:.0f}%",
                    "priority": "high",
                    "category": cat,
                    "reason": "Low accuracy"
                })
    
    # Streak maintenance
    if progress.get("streak", 0) > 0:
        suggestions.append({
            "title": f"Keep your {progress['streak']}-day streak alive!",
            "priority": "medium",
            "category": "daily",
            "reason": "Streak protection"
        })
    
    # Current affairs
    suggestions.append({
        "title": "Read today's current affairs summary",
        "priority": "medium",
        "category": "current_affairs",
        "reason": "Stay updated"
    })
    
    # Spaced repetition
    due_count = len(await crud.get_spaced_due(user_id, limit=10))
    if due_count > 0:
        suggestions.append({
            "title": f"Review {due_count} questions due for revision",
            "priority": "high",
            "category": "revision",
            "reason": "Spaced repetition"
        })
    
    return to_jsonable({"suggestions": suggestions[:5]})


@app.post("/admin/import")
async def import_questions(data: BulkQuestionImport):
    questions = data.questions
    if data.source:
        for q in questions:
            q["source"] = data.source
    inserted = await crud.bulk_insert_questions(questions)
    return to_jsonable({"inserted_count": len(inserted), "ids": inserted})

@app.get("/admin/stats")
async def admin_stats():
    counts = await crud.get_questions_count()
    total_users = await db.users.count_documents({})
    return to_jsonable({
        "question_counts": counts,
        "total_users": total_users
    })


# ============ Web Ingestion ============

@app.post("/admin/ingest-web")
async def ingest_from_web_endpoint(
    queries: Optional[List[str]] = None,
    limit: int = Query(default=10, le=50),
    skip_categories: str = Query(default="reasoning"),
    current_user: dict = Depends(get_current_user)
):
    """
    Search the web for PDF question papers and ingest them.
    
    - queries: Search terms (defaults to SSC/Railway papers)
    - limit: Max PDFs per query
    - skip_categories: Comma-separated categories to skip (e.g., "reasoning,english")
    """
    from .web_ingest import ingest_from_web
    
    skip_list = [s.strip().lower() for s in skip_categories.split(",") if s.strip()]
    
    result = await ingest_from_web(
        user_id=current_user["user_id"],
        queries=queries,
        limit_per_query=limit,
        skip_categories=skip_list
    )
    
    return to_jsonable(result)


@app.get("/admin/search-pdfs")
async def search_pdfs_endpoint(
    query: str = Query(default="SSC CGL previous year paper filetype:pdf"),
    limit: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Test PDF search without ingesting - returns found PDF links"""
    from .web_ingest import search_pdf_links
    
    links = search_pdf_links([query], max_results=limit)
    return {
        "query": query,
        "pdf_links_found": len(links),
        "links": links[:20]  # Return first 20
    }


@app.post("/admin/ingest-urls")
async def ingest_from_urls_endpoint(
    urls: List[str],
    scrape_pages: bool = Query(default=True, description="If true, scrape pages for PDF links; if false, treat as direct PDF URLs"),
    skip_categories: str = Query(default="reasoning"),
    current_user: dict = Depends(get_current_user)
):
    """
    Ingest PDFs from URLs.
    
    - urls: List of page URLs (e.g., cracku.in/ssc-cgl-previous-papers) or direct PDF URLs
    - scrape_pages: If true, scrape pages to find PDF links; if false, treat as direct PDFs
    - skip_categories: Categories to skip (e.g., "reasoning")
    
    Example pages with PDFs:
    - https://cracku.in/ssc-cgl-previous-papers
    - https://www.adda247.com/jobs/ssc-cgl-previous-year-question-paper/
    """
    from .web_ingest import ingest_from_urls
    
    skip_list = [s.strip().lower() for s in skip_categories.split(",") if s.strip()]
    
    result = await ingest_from_urls(
        user_id=current_user["user_id"],
        urls=urls,
        skip_categories=skip_list,
        scrape_pages=scrape_pages
    )
    
    return to_jsonable(result)


@app.get("/admin/scrape-pdfs")
async def scrape_pdfs_endpoint(
    url: str = Query(..., description="Page URL to scrape for PDF links"),
    current_user: dict = Depends(get_current_user)
):
    """Scrape a page for PDF links without downloading them"""
    from .web_ingest import scrape_pdf_links_from_page
    
    links = await scrape_pdf_links_from_page(url)
    return {
        "page_url": url,
        "pdf_links_found": len(links),
        "links": links[:50]
    }


# ============ PDF Upload & Custom Questions ============

@app.post("/upload/pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    pdf: UploadFile | None = File(default=None),
    file: UploadFile | None = File(default=None),
    question_count: int = Form(default=10),
    difficulty: str = Form(default="medium"),
    category: str = Form(default=""),  # Optional: gk, reasoning, current_affairs, etc.
    skip_categories: str = Form(default=""),  # Comma-separated categories to skip, e.g., "reasoning,english"
    current_user: dict = Depends(get_current_user)
):
    logger.info("[/upload/pdf] request received")
    """Upload a PDF and extract/generate questions from it"""
    from .pdf_processor import process_pdf_and_store_questions_sync
    from . import crud as _crud
    
    # Accept either 'pdf' or 'file' field names
    _f = pdf or file
    if not _f:
        raise HTTPException(422, "Missing PDF file in form-data (use field 'pdf' or 'file')")
    logger.info(f"[/upload/pdf] filename={_f.filename}")
    if not _f.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are allowed")
    
    content = await _f.read()
    logger.info(f"[/upload/pdf] read {len(content)} bytes")
    if len(content) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(400, "PDF file too large. Maximum size is 20MB")
    
    # Queue background processing to avoid client timeouts on large PDFs/embeddings
    # Create job record
    job_id = await _crud.create_upload_job(current_user["user_id"], _f.filename)
    logger.info(f"[/upload/pdf] created job_id={job_id}")

    async def _bg_process():
        try:
            await _crud.update_upload_job(job_id, {"status": "processing"})
            logger.info(f"[/upload/pdf] background processing start job_id={job_id}")
            loop = asyncio.get_event_loop()
            
            try:
                # Parse skip_categories into list
                skip_list = [s.strip().lower() for s in skip_categories.split(",") if s.strip()]
                
                result = await asyncio.wait_for(
                    loop.run_in_executor(
                        _PDF_EXECUTOR,
                        process_pdf_and_store_questions_sync,
                        current_user["user_id"],
                        content,
                        0,
                        difficulty,
                        category,  # Pass category to processor
                        skip_list,  # Categories to skip
                    ),
                    timeout=300,  # 5 minutes
                )
                await _crud.update_upload_job(job_id, {
                    "status": "done" if result.get("success") else "error",
                    "added": result.get("questions_extracted", 0),
                    "extracted": result.get("existing_found", 0),
                    "message": result.get("message", "Completed")
                })
            except asyncio.TimeoutError:
                logger.error(f"PDF processing timed out for job_id={job_id}")
                await _crud.update_upload_job(job_id, {"status": "error", "message": "Processing timed out after 5 minutes"})
            except Exception as e:
                logger.error(f"PDF processing error: {e}")
                await _crud.update_upload_job(job_id, {"status": "error", "message": str(e)})
        finally:
            logger.info(f"[/upload/pdf] background processing end job_id={job_id}")

    asyncio.create_task(_bg_process())

    # Immediate response to prevent mobile upload timeouts
    return to_jsonable({
        "success": True,
        "job_id": job_id,
        "questions_extracted": 0,
        "total_user_questions": 0,
        "existing_found": 0,
        "generated": 0,
        "message": "Upload received. Processing in background.",
    })

@app.get("/upload/status/{job_id}")
async def get_upload_status(job_id: str, current_user: dict = Depends(get_current_user)):
    from . import crud as _crud
    logger.info(f"[/upload/status] job_id={job_id} user={current_user['user_id']}")
    doc = await _crud.get_upload_job(job_id)
    if not doc or doc.get("user_id") != current_user["user_id"]:
        raise HTTPException(404, "Job not found")
    return to_jsonable(doc)

@app.get("/upload/status")
async def get_latest_upload_status(current_user: dict = Depends(get_current_user)):
    from . import crud as _crud
    logger.info(f"[/upload/status] latest for user={current_user['user_id']}")
    doc = await _crud.get_latest_upload_job(current_user["user_id"])
    if not doc:
        return {"status": "none"}
    return to_jsonable(doc)


@app.get("/questions/custom", response_model=CustomQuestionsResponse)
async def get_custom_questions(
    count: int = Query(default=10, le=100),
    mix_with_general: bool = Query(default=False),
    current_user: dict = Depends(get_current_user)
):
    """Get questions from user's uploaded content"""
    from .chroma_client import get_questions_from_collection
    
    user_id = current_user["user_id"]
    custom_questions = get_questions_from_collection(user_id, count=count)
    
    general_questions = []
    if mix_with_general and len(custom_questions) < count:
        remaining = count - len(custom_questions)
        general = await crud.fetch_questions("gk", limit=remaining)
        for q in general:
            q["id"] = str(q["_id"])
            q.pop("_id", None)
        general_questions = general
    
    all_questions = custom_questions + general_questions
    random.shuffle(all_questions)
    
    return {
        "questions": all_questions[:count],
        "custom_count": len(custom_questions),
        "general_count": len(general_questions)
    }


@app.get("/questions/custom/count")
async def get_custom_question_count(current_user: dict = Depends(get_current_user)):
    """Get count of user's custom questions"""
    from .chroma_client import get_user_question_count
    count = get_user_question_count(current_user["user_id"])
    return {"count": count}


@app.delete("/questions/custom")
async def clear_custom_questions(current_user: dict = Depends(get_current_user)):
    """Clear all user's custom questions"""
    from .chroma_client import clear_user_questions
    success = clear_user_questions(current_user["user_id"])
    return {"success": success}


@app.post("/admin/import-chroma-to-mongo")
async def import_chroma_to_mongodb(
    user_id: Optional[str] = Query(default=None, description="Specific user ID to import from, or all users if not specified"),
    dedupe: bool = Query(default=True, description="Skip questions that already exist in MongoDB"),
    current_user: dict = Depends(get_current_user)
):
    """Import questions from ChromaDB to MongoDB for use in daily quiz"""
    from .chroma_client import get_all_questions_from_collection, get_all_user_collections, get_chroma_client
    
    imported_count = 0
    skipped_count = 0
    errors = []
    
    # Get list of user IDs to process
    user_ids = []
    if user_id:
        user_ids = [user_id]
    else:
        # Get all user collections from ChromaDB
        client = get_chroma_client()
        collections = client.list_collections()
        for col in collections:
            name = col.name if hasattr(col, 'name') else str(col)
            if name.startswith("user_") and name.endswith("_questions"):
                # Extract user_id from collection name (user_{id}_questions)
                uid = name.replace("user_", "").replace("_questions", "").replace("_", "-")
                user_ids.append(uid)
    
    logger.info(f"[Import] Processing {len(user_ids)} user collections")
    
    for uid in user_ids:
        try:
            questions = get_all_questions_from_collection(uid)
            logger.info(f"[Import] User {uid}: found {len(questions)} questions in ChromaDB")
            
            for q in questions:
                # Check for duplicates if deduplication is enabled
                if dedupe:
                    existing = await db.questions.find_one({
                        "question": q["question"],
                        "category": q.get("category", "custom")
                    })
                    if existing:
                        skipped_count += 1
                        continue
                
                # Prepare question for MongoDB (remove chroma_id, add timestamps)
                mongo_doc = {
                    "question": q["question"],
                    "options": q["options"],
                    "answer_index": q["answer_index"],
                    "explanation": q.get("explanation", ""),
                    "category": q.get("category", "custom"),
                    "difficulty": q.get("difficulty", "medium"),
                    "source": "pdf_upload",
                    "uploaded_by": uid,
                    "imported_at": datetime.utcnow(),
                    "chroma_id": q.get("chroma_id")
                }
                
                await db.questions.insert_one(mongo_doc)
                imported_count += 1
                
        except Exception as e:
            logger.error(f"[Import] Error processing user {uid}: {e}")
            errors.append({"user_id": uid, "error": str(e)})
    
    return to_jsonable({
        "success": True,
        "imported": imported_count,
        "skipped_duplicates": skipped_count,
        "users_processed": len(user_ids),
        "errors": errors
    })


@app.post("/questions/quiz", response_model=QuizConfigResponse)
async def generate_quiz(
    config: QuizConfigRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a quiz with specified configuration"""
    from .chroma_client import get_questions_from_collection
    
    user_id = current_user["user_id"]
    count = min(config.count, 100)
    questions = []
    
    # Get custom questions if requested
    custom_count = 0
    if config.include_custom:
        try:
            # If categories specified or a topical query is provided, fetch accordingly from user library
            custom_categories = config.categories if (config.categories and len(config.categories) > 0) else None
            logger.info(f"[Quiz] Fetching custom questions: count={count}, categories={custom_categories}")
            custom_questions = get_questions_from_collection(
                user_id,
                count=count,  # Request full count from custom, will be trimmed later
                categories=custom_categories,
                query_text=config.query_text,
            )
            questions.extend(custom_questions)
            custom_count = len(custom_questions)
            logger.info(f"[Quiz] Got {custom_count} custom questions")
        except Exception as e:
            logger.error(f"ChromaDB error: {e}")
    
    # Fill remaining with general questions from database
    remaining = count - len(questions)
    if remaining > 0:
        categories = config.categories or ["reasoning", "gk", "current_affairs"]
        per_category = max(1, remaining // len(categories))
        
        for cat in categories:
            cat_questions = await crud.fetch_questions(cat, limit=per_category * 2)
            for q in cat_questions:
                q["id"] = str(q["_id"])
                q.pop("_id", None)
                if config.difficulty != "all":
                    q["difficulty"] = config.difficulty
            questions.extend(cat_questions)
    
    # If still no questions, use fallback questions
    if len(questions) == 0:
        questions = get_fallback_questions(count)
    
    random.shuffle(questions)
    questions = questions[:count]
    
    # Calculate time limit for test mode (1 minute per question)
    time_limit = None
    if config.mode == "test":
        time_limit = len(questions) * 60
    
    return {
        "questions": questions,
        "total_count": len(questions),
        "mode": config.mode,
        "time_limit_seconds": time_limit,
        "difficulty": config.difficulty
    }


def get_fallback_questions(count: int = 30):
    """Return fallback questions when database is empty"""
    base_questions = [
        {"id": "fb_1", "question": "What is the capital of India?", "options": ["Mumbai", "New Delhi", "Kolkata", "Chennai"], "answer_index": 1, "category": "gk", "explanation": "New Delhi is the capital city of India."},
        {"id": "fb_2", "question": "If A = 1, B = 2... then CAT = ?", "options": ["24", "25", "26", "27"], "answer_index": 0, "category": "reasoning", "explanation": "C(3) + A(1) + T(20) = 24"},
        {"id": "fb_3", "question": "Who is the current President of India (2024)?", "options": ["Ram Nath Kovind", "Droupadi Murmu", "Pratibha Patil", "A.P.J Abdul Kalam"], "answer_index": 1, "category": "current_affairs", "explanation": "Droupadi Murmu is the 15th President of India."},
        {"id": "fb_4", "question": "Find the missing number: 2, 6, 12, 20, ?", "options": ["28", "30", "32", "26"], "answer_index": 1, "category": "reasoning", "explanation": "Pattern: n × (n+1). 5 × 6 = 30"},
        {"id": "fb_5", "question": "Which river is known as the Sorrow of Bengal?", "options": ["Ganga", "Brahmaputra", "Damodar", "Hooghly"], "answer_index": 2, "category": "gk", "explanation": "Damodar River is called the Sorrow of Bengal."},
        {"id": "fb_6", "question": "What is the largest planet in our solar system?", "options": ["Earth", "Mars", "Jupiter", "Saturn"], "answer_index": 2, "category": "gk", "explanation": "Jupiter is the largest planet."},
        {"id": "fb_7", "question": "What is 15% of 200?", "options": ["25", "30", "35", "40"], "answer_index": 1, "category": "reasoning", "explanation": "15% of 200 = 30"},
        {"id": "fb_8", "question": "Which gas do plants absorb?", "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], "answer_index": 2, "category": "gk", "explanation": "Plants absorb Carbon Dioxide."},
        {"id": "fb_9", "question": "Complete: 1, 4, 9, 16, ?", "options": ["20", "23", "25", "27"], "answer_index": 2, "category": "reasoning", "explanation": "Perfect squares: 5² = 25"},
        {"id": "fb_10", "question": "Who wrote the Indian National Anthem?", "options": ["Bankim Chandra", "Rabindranath Tagore", "Sarojini Naidu", "Subhas Bose"], "answer_index": 1, "category": "gk", "explanation": "Rabindranath Tagore wrote Jana Gana Mana."},
        {"id": "fb_11", "question": "Which is the longest river in India?", "options": ["Yamuna", "Godavari", "Ganga", "Brahmaputra"], "answer_index": 2, "category": "gk", "explanation": "Ganga is the longest river in India."},
        {"id": "fb_12", "question": "5 workers do a job in 10 days. How many days for 10 workers?", "options": ["5 days", "20 days", "15 days", "8 days"], "answer_index": 0, "category": "reasoning", "explanation": "5×10 = 10×x, x = 5 days."},
        {"id": "fb_13", "question": "Chemical symbol for Gold?", "options": ["Go", "Gd", "Au", "Ag"], "answer_index": 2, "category": "gk", "explanation": "Au is the symbol for Gold."},
        {"id": "fb_14", "question": "Odd one out: 2, 5, 10, 17, 26, 35", "options": ["10", "17", "26", "35"], "answer_index": 3, "category": "reasoning", "explanation": "Pattern is n²+1. 35 should be 37."},
        {"id": "fb_15", "question": "Which planet is the Red Planet?", "options": ["Venus", "Mars", "Jupiter", "Mercury"], "answer_index": 1, "category": "gk", "explanation": "Mars is called the Red Planet."},
        {"id": "fb_16", "question": "Square root of 144?", "options": ["11", "12", "13", "14"], "answer_index": 1, "category": "reasoning", "explanation": "√144 = 12"},
        {"id": "fb_17", "question": "Father of the Nation in India?", "options": ["Nehru", "Gandhi", "Patel", "Ambedkar"], "answer_index": 1, "category": "gk", "explanation": "Mahatma Gandhi is the Father of the Nation."},
        {"id": "fb_18", "question": "Train 100m passes pole in 10 sec. Speed?", "options": ["36 km/h", "10 km/h", "100 km/h", "25 km/h"], "answer_index": 0, "category": "reasoning", "explanation": "Speed = 10 m/s = 36 km/h"},
        {"id": "fb_19", "question": "Which ocean is the largest?", "options": ["Atlantic", "Indian", "Pacific", "Arctic"], "answer_index": 2, "category": "gk", "explanation": "Pacific Ocean is the largest."},
        {"id": "fb_20", "question": "Fibonacci: 1, 1, 2, 3, 5, 8, ?", "options": ["11", "12", "13", "14"], "answer_index": 2, "category": "reasoning", "explanation": "5 + 8 = 13"},
        {"id": "fb_21", "question": "India gained independence in which year?", "options": ["1945", "1946", "1947", "1948"], "answer_index": 2, "category": "gk", "explanation": "India gained independence on August 15, 1947."},
        {"id": "fb_22", "question": "25% of 400?", "options": ["75", "100", "125", "150"], "answer_index": 1, "category": "reasoning", "explanation": "25% of 400 = 100"},
        {"id": "fb_23", "question": "Which vitamin from sunlight?", "options": ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], "answer_index": 3, "category": "gk", "explanation": "Vitamin D is produced by sunlight."},
        {"id": "fb_24", "question": "Monday + 100 days = ?", "options": ["Wednesday", "Thursday", "Friday", "Saturday"], "answer_index": 0, "category": "reasoning", "explanation": "100 ÷ 7 = 14r2. Monday + 2 = Wednesday."},
        {"id": "fb_25", "question": "Currency of Japan?", "options": ["Yuan", "Won", "Yen", "Dollar"], "answer_index": 2, "category": "gk", "explanation": "Yen is the currency of Japan."},
        {"id": "fb_26", "question": "Smallest prime number?", "options": ["0", "1", "2", "3"], "answer_index": 2, "category": "reasoning", "explanation": "2 is the smallest prime number."},
        {"id": "fb_27", "question": "Mount Everest is in which range?", "options": ["Andes", "Alps", "Himalayas", "Rockies"], "answer_index": 2, "category": "gk", "explanation": "Mount Everest is in the Himalayas."},
        {"id": "fb_28", "question": "Degrees in a right angle?", "options": ["45°", "90°", "180°", "360°"], "answer_index": 1, "category": "reasoning", "explanation": "A right angle is 90 degrees."},
        {"id": "fb_29", "question": "Who invented the telephone?", "options": ["Edison", "Bell", "Tesla", "Marconi"], "answer_index": 1, "category": "gk", "explanation": "Alexander Graham Bell invented the telephone."},
        {"id": "fb_30", "question": "LCM of 4 and 6?", "options": ["10", "12", "18", "24"], "answer_index": 1, "category": "reasoning", "explanation": "LCM of 4 and 6 is 12."},
    ]
    
    questions = []
    for i in range(count):
        idx = i % len(base_questions)
        q = base_questions[idx].copy()
        q["id"] = f"fb_{i + 1}"
        questions.append(q)
    
    return questions


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
