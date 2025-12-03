from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime

class PickQuestionsResponse(BaseModel):
    questions: List[dict]
    did_you_know: Optional[dict] = None
    motivational_quote: Optional[dict] = None

class AnswerPayload(BaseModel):
    user_id: Optional[str] = None
    question_id: str
    chosen_index: int
    time_ms: int

class AnswerResponse(BaseModel):
    correct: bool
    explanation: str
    points_earned: int
    streak: int
    new_badge: Optional[dict] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class StudyPreferencesUpdate(BaseModel):
    morning_time: Optional[str] = None
    evening_time: Optional[str] = None
    daily_goal_questions: Optional[int] = None
    preferred_categories: Optional[List[str]] = None
    notification_enabled: Optional[bool] = None
    focus_session_minutes: Optional[int] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    estimated_minutes: Optional[int] = None
    recurring: bool = False
    recurring_pattern: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None

class ProgressStats(BaseModel):
    streak: int
    longest_streak: int
    points: int
    level: int
    total_questions: int
    correct_answers: int
    accuracy_percentage: float
    badges_count: int
    today_questions: int
    today_correct: int
    weekly_stats: List[dict]
    category_breakdown: Dict[str, dict]

class DashboardResponse(BaseModel):
    user_name: str
    greeting: str
    motivational_quote: dict
    streak: int
    points: int
    level: int
    today_progress: dict
    pending_tasks: List[dict]
    did_you_know: dict
    next_review_questions: int
    upcoming_exam: Optional[dict] = None

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    points: int
    streak: int
    level: int

class DailyLogCreate(BaseModel):
    mood: Optional[str] = None
    notes: Optional[str] = None

class AIGenerateRequest(BaseModel):
    # Frontend sends { prompt } for AI task generation
    prompt: Optional[str] = None
    # Support alternative structured fields as well
    topic: Optional[str] = None
    category: Optional[str] = None
    count: int = 10
    difficulty: int = 2
    exam_type: Optional[str] = None

class ExamCreate(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    notes: Optional[str] = None

class ExamResponse(BaseModel):
    id: str
    name: str
    date: str
    days_left: Optional[int] = None
    notes: Optional[str] = None

class BulkQuestionImport(BaseModel):
    questions: List[dict]
    source: Optional[str] = None

class FCMTokenUpdate(BaseModel):
    fcm_token: str

class PDFUploadResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    questions_extracted: int
    total_user_questions: int
    message: str
    existing_found: Optional[int] = 0
    generated: Optional[int] = 0

class CustomQuestionsRequest(BaseModel):
    count: int = 10
    category: Optional[str] = None
    difficulty: Optional[str] = "medium"
    mix_with_general: bool = False

class CustomQuestionsResponse(BaseModel):
    questions: List[dict]
    custom_count: int
    general_count: int

class QuizConfigRequest(BaseModel):
    count: int = 30
    difficulty: str = "medium"
    mode: str = "practice"
    categories: Optional[List[str]] = None
    include_custom: bool = True
    query_text: Optional[str] = None

class QuizConfigResponse(BaseModel):
    questions: List[dict]
    total_count: int
    mode: str
    time_limit_seconds: Optional[int] = None
    difficulty: str
