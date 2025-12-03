from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, date
from enum import Enum

class QuestionType(str, Enum):
    MCQ = "mcq"
    SHORT = "short"
    FACT = "fact"
    VISUAL = "visual"

class Category(str, Enum):
    REASONING = "reasoning"
    CURRENT_AFFAIRS = "current_affairs"
    GK = "gk"
    VISUAL_MEMORY = "visual_memory"

class BadgeType(str, Enum):
    FIRST_QUIZ = "first_quiz"
    STREAK_7 = "streak_7"
    STREAK_30 = "streak_30"
    STREAK_100 = "streak_100"
    QUESTIONS_100 = "questions_100"
    QUESTIONS_500 = "questions_500"
    QUESTIONS_1000 = "questions_1000"
    PERFECT_QUIZ = "perfect_quiz"
    CATEGORY_MASTER = "category_master"
    EARLY_BIRD = "early_bird"
    NIGHT_OWL = "night_owl"
    CONSISTENCY_KING = "consistency_king"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Question(BaseModel):
    id: Optional[str] = None
    type: str = "mcq"
    category: str
    question: str
    options: Optional[List[str]] = None
    answer_index: Optional[int] = None
    explanation: Optional[str] = None
    tags: Optional[List[str]] = []
    difficulty: Optional[int] = 2
    source: Optional[str] = None
    image_url: Optional[str] = None
    year: Optional[int] = None
    exam_name: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

class AnswerAttempt(BaseModel):
    user_id: str
    question_id: str
    correct: bool
    time_ms: int
    category: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)

class Badge(BaseModel):
    type: str
    name: str
    description: str
    icon: str
    earned_at: datetime = Field(default_factory=datetime.utcnow)

class StudyPreferences(BaseModel):
    morning_time: Optional[str] = "09:00"
    evening_time: Optional[str] = "19:00"
    daily_goal_questions: int = 30
    preferred_categories: List[str] = ["reasoning", "gk", "current_affairs"]
    notification_enabled: bool = True
    focus_session_minutes: int = 25

class UserProgress(BaseModel):
    user_id: str
    spaced_meta: dict = {}
    streak: int = 0
    longest_streak: int = 0
    points: int = 0
    level: int = 1
    total_questions_answered: int = 0
    correct_answers: int = 0
    badges: List[Badge] = []
    last_active_date: Optional[str] = None
    category_stats: Dict[str, Dict] = {}
    study_preferences: Optional[StudyPreferences] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Task(BaseModel):
    id: Optional[str] = None
    user_id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    recurring: bool = False
    recurring_pattern: Optional[str] = None
    parent_task_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class DailyLog(BaseModel):
    user_id: str
    date: str
    questions_answered: int = 0
    correct_answers: int = 0
    time_spent_minutes: int = 0
    tasks_completed: int = 0
    categories_covered: List[str] = []
    mood: Optional[str] = None
    notes: Optional[str] = None

class DidYouKnow(BaseModel):
    id: Optional[str] = None
    fact: str
    category: str
    source: Optional[str] = None
    tags: List[str] = []
    importance: int = 1

class MotivationalQuote(BaseModel):
    id: Optional[str] = None
    quote: str
    author: Optional[str] = None
    category: str = "general"
    for_situation: Optional[str] = None

class User(BaseModel):
    id: Optional[str] = None
    email: str
    name: str
    password_hash: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    fcm_token: Optional[str] = None
    timezone: str = "Asia/Kolkata"
