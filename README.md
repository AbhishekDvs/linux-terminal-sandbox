# 🧪 Linux Terminal Sandbox

A secure, browser-based Linux terminal simulation where users can execute safe commands in an isolated environment — built with **Next.js**, **FastAPI**, and **Docker**.

---

## 🚀 Live Demo

🌐 [Try it Now](https://terminalsandbox.pages.dev/)  
🔒 Secure, containerless environment  
⚙️ Debian-based simulation  

---

## 📦 Tech Stack

### 🖥 Frontend
- [Next.js](https://nextjs.org/) (App Router)
- TypeScript, TailwindCSS
- Axios for API calls

### ⚙️ Backend
- [FastAPI](https://fastapi.tiangolo.com/)
- Secure command execution with validation
- Session management with temporary isolation
- Dockerized for easy deployment

---

## 💡 Features

✅ Isolated terminal sessions per user  
✅ Only safe Linux commands are allowed  
✅ Smart command validation (e.g., blocks `rm`, `sudo`, etc.)  
✅ Typing animation output  
✅ Grouped command list with one-click execution  
✅ Fully responsive UI (mobile + desktop)  
✅ Dark-mode, glassmorphic UI

---

## 🛠️ Getting Started (Local Development)

### 1. Clone the repo
```bash
git clone https://github.com/abhishekdvs/linux-terminal-sandbox.git
cd linux-terminal-sandbox
````

### 2. Backend Setup

```bash
cd fundotai-backend
cp .env.example .env  # Set environment variables
docker build -t terminal-api .
docker run -p 10000:10000 terminal-api
```

OR with Python directly:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 10000
```

### 3. Frontend Setup

```bash
cd terminal-frontend
cp .env.example .env  # Add NEXT_PUBLIC_API_BASE=http://localhost:10000
npm install
npm run dev
```

---

## 📂 Folder Structure

```
/
├── fundotai-backend/     # FastAPI backend
│   ├── routes/            # API routes
│   ├── utils/             # Helpers and command validation
│   └── main.py            # Entrypoint
└── fundotai-frontend/     # Next.js frontend
    └── /      # Main page and UI logic
```

---

## 🔐 Security Measures

* ❌ Dangerous commands are blocked (e.g., `rm`, `sudo`, `&&`, `|`, etc.)
* 🧼 Output is sanitized
* 🧊 Each session uses a temporary working directory
* 🧠 Pattern matching on command input for safety

---

## 🧠 Inspiration

This project was built as a safe playground for learning Linux commands without the risk of breaking anything — ideal for beginners or demos.

---

## 📜 License

[GNU Affero General Public License v3.0 (AGPL-3.0)]

---

## ✨ Author

Made with 🧠 and ☕ by [Abhishek Dvs](https://github.com/abhishekdvs)


