# 📚 Study Buddy - Your Exam Preparation Companion

A beautiful, feature-rich mobile app designed to help prepare for government exams (SSC, Railway NTPC, State PSC) with daily practice, gamification, and smart learning features.

![Study Buddy](https://img.shields.io/badge/version-2.0.0-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.72-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688)

## ✨ Features

### 📝 Daily Quiz System
- **30 Questions Daily**: 10 Reasoning + 10 GK + 10 Current Affairs
- **Smart Question Selection**: Spaced repetition algorithm ensures you review at optimal intervals
- **Category Practice**: Focus on specific areas when needed
- **Previous Year Papers**: Questions from SSC, Railway, and State PSC exams

### 🎮 Gamification & Motivation
- **Streak System**: Build daily streaks and stay consistent
- **Points & Levels**: Earn points for every answer, level up as you progress
- **Badges**: Unlock achievements for milestones (First Quiz, Week Warrior, Century, etc.)
- **Visual Progress**: Beautiful charts showing your improvement

### 📋 Task Planner
- **Study Schedule**: Plan your study sessions with task management
- **Priority System**: Low, Medium, High, and Urgent tasks
- **Due Dates**: Never miss a deadline
- **Progress Tracking**: Mark tasks as complete and track productivity

### 💡 Smart Learning
- **"Did You Know?" Facts**: Random interesting facts to boost GK
- **Motivational Quotes**: Daily inspiration in English and Hindi
- **Visual Memory Support**: Image-based questions (coming soon)
- **Detailed Explanations**: Learn from every question

### 🔔 Smart Notifications
- **Morning & Evening Reminders**: Customizable study times
- **Streak Alerts**: Don't break your streak!
- **Motivational Pushes**: Get encouraged when you need it

### 📊 Progress Analytics
- **Weekly Charts**: See your daily activity
- **Category Breakdown**: Know your strengths and weaknesses
- **Accuracy Tracking**: Monitor your improvement
- **Today's Summary**: Quick overview of daily progress

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Expo CLI (`npm install -g expo-cli`)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Seed the database
cd seed
python seed_database.py
cd ..

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start

# For Android
npx expo start --android

# For iOS
npx expo start --ios
```

### API Configuration

Update the API URL in `mobile/utils/api.js`:
- For Android Emulator: `http://10.0.2.2:8000`
- For iOS Simulator: `http://localhost:8000`
- For Physical Device: Use your computer's IP address

## 📁 Project Structure

```
study-buddy-mvp/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # Pydantic models
│   │   ├── schemas.py       # Request/Response schemas
│   │   ├── crud.py          # Database operations
│   │   ├── auth.py          # JWT authentication
│   │   ├── config.py        # Configuration
│   │   ├── deps.py          # Database connection
│   │   └── scheduler.py     # Background tasks
│   ├── seed/
│   │   ├── sample_questions.json
│   │   ├── motivational_quotes.json
│   │   ├── did_you_know.json
│   │   └── seed_database.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── mobile/
    ├── screens/
    │   ├── OnboardingScreen.js
    │   ├── HomeScreen.js
    │   ├── QuizScreen.js
    │   ├── ResultScreen.js
    │   ├── TasksScreen.js
    │   ├── StatsScreen.js
    │   └── ProfileScreen.js
    ├── components/
    │   └── QuestionCard.js
    ├── utils/
    │   ├── api.js
    │   ├── theme.js
    │   └── NotificationService.js
    ├── App.js
    ├── app.json
    └── package.json
```

## 🔑 API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login

### User
- `GET /user/dashboard` - Get dashboard data
- `GET /user/stats` - Get progress statistics
- `GET /user/badges` - Get earned badges
- `GET/PUT /user/preferences` - Study preferences

### Questions
- `GET /questions/daily` - Get daily questions
- `GET /questions/category/{category}` - Get category questions
- `GET /questions/review` - Get spaced repetition review
- `POST /questions/answer` - Submit answer

### Tasks
- `GET /tasks` - List all tasks
- `POST /tasks` - Create new task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task

### Motivation
- `GET /motivation/quote` - Get random quote
- `GET /motivation/fact` - Get "Did You Know" fact

## 🎨 Design System

### Colors
```javascript
primary: '#6C63FF'
success: '#4CAF50'
warning: '#FFC107'
error: '#F44336'
streak: '#FF9500'
points: '#34C759'
level: '#AF52DE'
```

### Typography
- Headers: System fonts with bold weights
- Body: 16px regular
- Captions: 14px regular

## 📱 Screenshots

(Add your screenshots here)

1. **Onboarding** - Beautiful welcome flow
2. **Dashboard** - Streak, points, and quick actions
3. **Quiz** - Clean question interface with feedback
4. **Results** - Detailed performance breakdown
5. **Stats** - Charts and progress visualization
6. **Tasks** - Todo list for study planning

## 🛠 Tech Stack

- **Mobile**: React Native (Expo)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT
- **Notifications**: Expo Notifications

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is for personal use. Made with ❤️ for exam preparation.

## 💡 Future Enhancements

- [ ] Offline mode with local question storage
- [ ] Visual memory mode with image-based questions
- [ ] Weekly/monthly reports via email
- [ ] Leaderboard for competitive motivation
- [ ] Voice-based question answering
- [ ] PDF import for custom question papers
- [ ] AI-powered question generation from topics

---

**Made with ❤️ for your success!**
