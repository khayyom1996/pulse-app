# Pulse 💕

Telegram Mini App для укрепления отношений с геймификацией близости.

## Быстрый старт

### Локальная разработка

```bash
# 1. Клонировать и настроить
cd /Users/abdurahim/AgentProjects/pulse

# 2. Установить зависимости
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Запустить с Docker Compose
export TELEGRAM_BOT_TOKEN=
docker-compose up -d

# 4. Заполнить базу данных
docker-compose exec backend node src/seed.js

# 5. Открыть
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000/health
```

### Без Docker

```bash
# Terminal 1: PostgreSQL и Redis (уже должны быть запущены)

# Terminal 2: Backend
cd backend
npm install
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

## Структура проекта

```
pulse/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── bot/       # Telegram Bot
│   │   ├── config/    # DB, Redis, config
│   │   ├── models/    # Sequelize models
│   │   ├── routes/    # API endpoints
│   │   └── services/  # Business logic
│   └── Dockerfile
├── frontend/          # React + Vite TMA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── i18n/      # Локализация (RU/EN/TG)
│   │   └── api/
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Авторизация через Telegram |
| POST | `/api/auth/create-pair` | Создать пару |
| POST | `/api/auth/join-pair` | Присоединиться к паре |
| POST | `/api/love` | Отправить любовь |
| GET | `/api/love/streak` | Получить стрик |
| GET | `/api/dates` | Список дат |
| POST | `/api/dates` | Создать дату |
| GET | `/api/wishes/cards` | Карточки желаний |
| POST | `/api/wishes/swipe` | Свайп карточки |
| GET | `/api/wishes/matches` | Совпадения |

## Деплой на Railway

```bash
# 1. Залогиниться
railway login

# 2. Создать проект
railway init

# 3. Добавить PostgreSQL и Redis
railway add -d postgres
railway add -d redis

# 4. Задеплоить
railway up
```

## Environment Variables

### Backend
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
TELEGRAM_BOT_TOKEN=...
WEBAPP_URL=https://your-frontend-url.railway.app
```

### Frontend
```env
VITE_API_URL=https://your-backend-url.railway.app
```

## Фичи

- 💕 **Love Button** — отправка любви с haptic feedback
- 📅 **Date Tracker** — важные даты с напоминаниями
- 💜 **Wishes Cards** — свайп-матчинг желаний
- 🌳 **Tree Streak** — 5 стадий роста дерева
- 🌐 **i18n** — RU/EN/TG локализация

## Telegram Bot Commands

- `/start` — начать работу
- `/link` — получить код приглашения
- `/unlink` — разорвать связь

---

Built with ❤️ for Tajikistan & CIS
