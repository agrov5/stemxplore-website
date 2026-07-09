# STEMXplore 🚀

The official website for **STEMXplore** — a robotics and STEM education club — plus **EduLynk**, the admin panel that runs the whole operation behind the scenes.

This isn't just a static landing page. It's two apps living in one codebase: a public-facing site for parents and students, and a full management portal for staff.

## What's inside

### 🌐 The Website (`/`)

The public site is where families discover STEMXplore. It's a single-page experience built with React and CSS Modules, featuring:

- **Hero & About** — who we are and what we do
- **Programs** — the courses and camps we offer
- **Gallery** — photos from classes and events
- **Stats & Values** — the numbers and principles behind the club
- **Trainer profiles** — meet the people teaching
- **PD Day banner** — a dismissible banner that shows up when a PD Day camp is coming (managed from the admin panel, no code changes needed)
- **Contact form** — so parents can reach out directly

### 🎓 EduLynk (`/EduLynk`)

EduLynk is the school-management system that powers everything. Staff log in and get a full dashboard for day-to-day operations:

- **Students, Parents & Teachers** — full records for everyone in the program, with student grouping
- **Classes & Attendance** — schedule classes on a calendar and track who showed up
- **Fees, Invoices & Expenses** — billing per family, invoice generation (PDF export included), and expense tracking
- **Financial Reports** — charts and summaries so you actually know how the club is doing
- **Announcements** — push updates out to families
- **Email** — password resets and notifications sent via Resend
- **Data Import** — bulk-import existing records instead of typing them in one by one
- **User Management** — role-based access (admin / teacher / student), so people only see what they should

The neat part is the **Website Manager**: admins can update the public site — gallery photos, program listings, homepage stats, and PD Day banners — right from EduLynk. The website stays fresh without anyone touching the code.

## Tech stack

| Layer | What we use |
|---|---|
| Frontend | React 19, Vite, React Router 7 |
| Styling | Tailwind CSS + Radix UI (EduLynk), CSS Modules (public site) |
| Charts & extras | Recharts, Framer Motion, react-big-calendar, jsPDF |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Email | Resend |
| Hosting | Vercel (frontend) |

## Running it locally

You'll need **Node.js** and **Python 3** installed.

**1. Install frontend dependencies:**

```bash
npm install
```

**2. Set up the backend:**

```bash
cd Edyu-Lynk/backend
pip install -r requirements.txt
```

The backend expects a few environment variables — most importantly `MONGO_URL` for the database connection, plus `RESEND_API_KEY` and `SENDER_EMAIL` if you want emails to actually send.

**3. Start everything at once:**

```bash
npm start
```

This runs the Vite dev server and the FastAPI backend (port 8001) together. The website will be at `http://localhost:5173`, and EduLynk at `http://localhost:5173/EduLynk`.

Prefer to run them separately? `npm run dev` for the frontend, and `uvicorn server:app --port 8001 --reload` from `Edyu-Lynk/backend` for the API.

> **Note:** The first account registered on a fresh database automatically becomes the admin.

## Project layout

```
├── src/                  # Public website (React + CSS Modules)
│   ├── components/       # Hero, Programs, Gallery, Contact, etc.
│   └── edylynk/          # EduLynk frontend (pages, components, services)
├── Edyu-Lynk/
│   └── backend/          # FastAPI server + MongoDB models
├── public/               # Static assets
└── vercel.json           # Deployment config
```

---

Built with ❤️ for the STEMXplore community.
