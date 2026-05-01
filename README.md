# Interactive Story AI - Multi-Agent LLM Storyteller

Hệ thống tạo tiểu thuyết tương tác sử dụng kiến trúc Multi-Agent.

## Cấu trúc dự án

```
interactive-story/
├── frontend/          # Next.js 14 (React + TypeScript + Tailwind)
├── backend/           # Python FastAPI + LangGraph
├── docker-compose.yml # MongoDB + Qdrant
└── README.md
```

## Khởi chạy Database (Docker)

```bash
docker-compose up -d
```

## Khởi chạy Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Khởi chạy Frontend

```bash
cd frontend
npm install
npm run dev
```
