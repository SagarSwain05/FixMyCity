# FixMyCity

**Civic issue reporting for Indian cities.** Citizens report potholes, broken streetlights, garbage and more with a photo and GPS pin. Neighbours confirm reports. Officials verify, route and resolve them from a command center. Built for Smart India Internal Hackathon 2025.

## Live demo

| | URL |
|---|---|
| 🌐 Landing page & citizen app | https://fixmycity-five.vercel.app |
| 🏛️ Municipal command center | https://fixmycity-admin.vercel.app |
| ⚙️ API · [system status](https://fixmycity-five.vercel.app/status) | https://fixmycity-api-32es.onrender.com/api/health |

Demo logins: citizen `9777000001` / `Demo@1234` · Roads staff `pwd.officer@demo.fixmycity.in` / `Demo@1234` · Sanitation staff `swm.officer@demo.fixmycity.in` / `Demo@1234`.

> The API runs on Render's free tier and sleeps after 15 minutes idle. Open **System status** on the landing page (or the login screen of the command center) and press **Wake / restart server**; it is ready in about 30–60 s.

| App | Folder | For | Deploys to |
|---|---|---|---|
| Citizen app (mobile-first PWA) | [`client/`](client) | Residents | Vercel |
| Command center | [`admin/`](admin) | Municipal admins and department staff | Vercel |
| API + realtime | [`server/`](server) | Both apps | Render |

Data lives in MongoDB Atlas, media in Cloudinary, and status emails go through Brevo.

Visitors to the root URL see a **landing page** explaining the project to citizens and governments, with live platform numbers, a live map and a **System status** panel (API, database, media storage, email, realtime) that can wake a sleeping server or reconnect the database.

## Features

**Citizens**
- Report with up to 5 photos or videos, captured straight from the camera.
- GPS auto-location on a draggable map pin, with reverse-geocoded address and ward.
- Nine categories. Each report is auto-routed to the department that owns its category.
- **Duplicate check before submit:** open issues of the same category within 50 m are shown first, so the citizen can upvote instead of filing again.
- **Crowd verification:** citizens get prompts to confirm or dispute new reports within 2 km. Three confirmations mark a report *community-verified*, and the community's severity rating can escalate its urgency.
- Live status tracking with a timeline, real-time in-app notifications (Socket.IO), and optional emails.
- Feedback after resolution: confirming the fix closes the report, and "not fixed" reopens it.
- Reputation points, achievements and a citywide leaderboard.
- Assistant chatbot: explains how to report, looks up your reports' status, and suggests a category from a description.
- Light, dark and system themes.

**Officials**
- Role-based access: **admin** sees the whole city; **staff** see and act only on their department's queue.
- Dashboard with KPIs (open, resolved, SLA breaches, average resolution time, community-verified), a 30-day trend and urgent issues. It updates live as reports arrive.
- Verification queue (most-upvoted first) with duplicate warnings. Verify, reject with a reason, assign a department and field worker, add notes, attach proof of work, resolve or reopen.
- Live map with status pins and **hotspot** clusters (2 or more open issues within about 100 m).
- Analytics: department performance (resolution rate, SLA breaches, average time), ward hotspots, resolution time by category, and JSON/CSV export.
- Department and staff management.

## Quick start (local)

Prerequisites: Node 20+ and MongoDB (local `mongod`, Docker, or an Atlas URI).

```bash
npm install && npm run install:all

cp server/.env.example server/.env      # set MONGODB_URI (e.g. mongodb://127.0.0.1:27017) and JWT_SECRET
cp client/.env.example client/.env
cp admin/.env.example admin/.env

npm run seed      # 6 departments, 6 staff, 4 citizens, 30 issues around Bhubaneswar
npm run dev       # API :4000 · citizen app :5173 · command center :5174
npm test          # API integration tests (spins up an in-memory MongoDB)
```

### Demo accounts (after `npm run seed`)

| Role | Login | Password |
|---|---|---|
| Admin | `admin@fixmycity.in` or `9000000000` | `Admin@1234` (from `ADMIN_*` env) |
| Staff (Roads) | `pwd.officer@demo.fixmycity.in` | `Demo@1234` |
| Staff (Sanitation) | `swm.officer@demo.fixmycity.in` | `Demo@1234` |
| Citizen | `9777000001` (Saanvi Sahoo) | `Demo@1234` |

Change the admin password after the first login in production.

## Documentation

- [Architecture and system design](docs/ARCHITECTURE.md): components, data model, workflows, design decisions.
- [API reference](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md): MongoDB Atlas, Render, Vercel, Cloudinary, Brevo.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, React Router, Leaflet/OpenStreetMap, Recharts, Framer Motion · Node.js, Express, Mongoose (MongoDB 2dsphere geo queries), Zod, JWT, Socket.IO, Multer · Cloudinary · Brevo.

## Team

Sagar Swain, Saanvi Sahoo. Guidance: Aditya Narayan Das, Sumanta Sahoo.

## License

[MIT](LICENSE)
