# Nexus Tale: AI-Powered Interactive RPG Storyteller

An advanced, full-stack Interactive Fiction RPG engine powered by a multi-agent LLM architecture. Nexus Tale allows players to create customized worlds, characters, and dynamically shape their own stories through natural language and RPG choices.

![Hero Banner](frontend/public/images/herosection.png)

## 🌟 Key Features

### 🧠 Multi-Agent AI Pipeline
The backend utilizes LangGraph to orchestrate a sophisticated team of AI agents for every turn:
- **Director Agent:** Manages the overarching plot, tracks quest progress, evaluates logic, and decides how the world reacts to the player.
- **Writer Agent:** Crafts high-quality, atmospheric, and evocative prose based on the Director's outline.
- **GameMaster Agent:** Generates 3-4 plausible, branching choices for the player, including risky options, combat scenarios, and logical consequences.
- **State Extractor Agent:** Parses the narrative into structured JSON to update the RPG state (inventory, health, location, quests).

### 🎮 Deep RPG Mechanics
- **Dynamic Character Sheets:** Track physical & mental traits (Stress, Logic, Obsession, etc.), special abilities, and expanding skill trees.
- **Economy & Inventory:** Buy, sell, and discover items. The AI natively tracks currency (e.g., Gold, Credits) and manages inventory automatically based on narrative events.
- **Factions & Relationships:** Join organizations, track reputation, and manage deep relationships with dynamically generated NPCs.
- **Location & Map System:** Traverse a persistent world map. Moving to locked locations will trigger narrative roadblocks.

### 🎨 Premium "Soft UI" Frontend
- Built with **Next.js 14**, React, and **Framer Motion**.
- Stunning glassmorphism design, dark mode, smooth page transitions, and micro-animations.
- **Scroll-spy Navigation & Reading Modes:** Toggle between seamless continuous scrolling or single-chapter book views with a fully functional Table of Contents teleportation system.
- **Interactive Hologram Avatars:** Dynamic SVG avatars that reflect the character's core aesthetic.
- **Real-time Map & Radar Charts:** Visual representations of character stats and relationships using Recharts.

---

## 🏗️ Architecture Stack

- **Frontend:** Next.js 14, React, TypeScript, Framer Motion, Recharts, Lucide Icons.
- **Backend:** Python 3.11, FastAPI, LangGraph, LangChain, Pydantic.
- **Database:** MongoDB (Persistent RPG State & Configs).
- **Vector Search:** Qdrant (Long-term story memory & context retrieval).
- **Models Supported:** Google Gemini, Anthropic Claude, Groq Llama 3, OpenAI GPT-4.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (For local frontend dev)
- Python 3.11+ (For local backend dev)
- An API Key from Google (Gemini), Anthropic, Groq, or OpenAI.

### 🐳 Option 1: Full Docker Deployment (Production / Quick Start)

The easiest way to get everything running is via Docker Compose.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Arcis-u/llm-storygen.git
   cd llm-storygen
   ```

2. **Configure Environment Variables:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and add your API Keys (e.g., `GEMINI_API_KEY`). You can also configure which models each Agent uses in this file.

3. **Spin up the stack:**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application:**
   - Frontend: `http://localhost:3000`
   - Backend API Docs: `http://localhost:8000/docs`

---

### 💻 Option 2: Local Development Setup

If you want to modify the code and see hot-reloads, run the services locally.

#### 1. Start the Databases
You still need MongoDB and Qdrant running. The easiest way is to use the provided compose file but only start the DBs:
```bash
docker-compose up -d mongodb qdrant
```

#### 2. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # Edit this file with your API keys!

uvicorn app.main:app --reload --port 8000
```

#### 3. Start the Frontend (Next.js)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📖 How to Play

1. **World Creation:** On the homepage, select a genre (Cyberpunk, Wuxia, Horror, etc.) or write your own world description. Enter your character's name and backstory.
2. **Pre-game Customization:** The "World Builder" AI will generate traits, abilities, shop items, and factions based on your prompt. Customize your starting loadout.
3. **Gameplay:** 
   - Read the generated chapters.
   - Choose one of the 3 AI-generated choices, OR type your own custom action in the terminal at the bottom.
   - Use the HUD on the left and right to track your inventory, stress levels, map location, and faction standings.
4. **Navigation:** Use the dropdown in the top sticky header to quickly teleport to previous chapters.

---

## 🛠️ Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open-source and available under the MIT License.
