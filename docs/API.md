# API reference

Base URL: `https://<your-api>.onrender.com/api`. Authenticated routes need `Authorization: Bearer <token>`.
Errors come back as `{ success: false, message, errors?: [{ field, message }] }`.

Legend: 🌐 public · 👤 any signed-in user · 🛠 staff or admin · 🔑 admin only

## Auth & profile
| Method | Path | | Notes |
|---|---|---|---|
| POST | `/auth/signup` | 🌐 | `{ fullName, phone, email, password, address: { city, state?, zip?, street? } }`. `phone` may be 10 digits or `+91…`. Returns `{ data: { accessToken, user } }` |
| POST | `/auth/login` | 🌐 | `{ identifier, password }`. `identifier` is a phone or an email |
| GET | `/auth/me` | 👤 | Current user |
| GET/PUT | `/profile` | 👤 | Update `fullName`, `email`, `address`, `emailNotifications` |
| POST | `/profile/avatar` | 👤 | multipart `avatar` |
| POST | `/profile/password` | 👤 | `{ currentPassword, newPassword }` |

## Issues
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/issues` | 🌐 | Filters: `status` (CSV or `open`), `category`, `urgency`, `ward`, `department` (id or `unassigned`), `q` (text search), `mine=true`, `lat`,`lng`,`radius` (m), `from`,`to`, `sort` (`newest`/`oldest`/`upvotes`/`updated`), `page`, `limit` (≤200). Staff are scoped to their department |
| GET | `/issues/map` | 🌐 | Lightweight pins, same filters |
| GET | `/issues/nearby?lat&lng&category&radius` | 🌐 | Duplicate check (default radius 50 m) |
| GET | `/issues/verify-queue?lat&lng` | 👤 | Nearby reports awaiting community verification |
| GET | `/issues/:id` | 🌐 | Full issue. Includes `hasUpvoted`, `myVerification`, `isOwner` for the viewer |
| POST | `/issues` | 👤 | multipart: `title`, `description?`, `category?` (inferred if missing), `urgency`, `location?`, `ward?`, `coordinates` (JSON `{lat,lng}`), `files[]` (≤5 image/video, 15 MB each) |
| POST | `/issues/:id/upvote` | 👤 | Toggle |
| POST | `/issues/:id/verify` | 👤 | `{ verdict: "confirm" \| "dispute", severity? }`, once per user, not on your own report |
| POST | `/issues/:id/feedback` | 👤 reporter | `{ satisfied, rating?, comment? }`. Only when resolved; closes or reopens |
| PATCH | `/issues/:id` | 🛠 | `{ status?, urgency?, category?, assignedDepartment?, assignedTo?, note?, rejectionReason?, resolutionNote? }`, optional multipart `files[]` as proof |
| POST | `/issues/:id/resolve` | 🛠 | Quick resolve, `{ note? }` |
| DELETE | `/issues/:id` | 👤 owner while pending · 🔑 any | Also deletes the media |

## Rewards, notifications, assistant
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/rewards/leaderboard?city&limit` | 🌐 | |
| GET | `/rewards/me` | 👤 | Points, rank, stats, achievements, top 10 |
| GET | `/rewards/me/transactions` | 👤 | Points ledger |
| GET | `/notifications` | 👤 | `{ items, unread }` |
| PATCH | `/notifications/:id/read` · POST `/notifications/read-all` · DELETE `/notifications/:id` | 👤 | |
| POST | `/chat` | 🌐 (personalised when signed in) | `{ message }` returns `{ reply, suggestions[], action? }` |
| GET | `/meta` | 🌐 | Categories, statuses, departments |

## Command center
| Method | Path | | Notes |
|---|---|---|---|
| GET | `/admin/analytics?days&department` | 🛠 | KPIs, trends, ward/department performance, hotspots |
| GET | `/admin/departments` | 🛠 | With staff, open and resolved counts |
| POST/PATCH/DELETE | `/admin/departments[/:id]` | 🔑 | Delete is refused while the department has open issues |
| GET | `/admin/users?role&department&q` | 🛠 | |
| POST | `/admin/users` | 🔑 | Create staff or admin `{ fullName, phone, email, password, role, department }` |
| PATCH | `/admin/users/:id` | 🔑 | `{ role?, department?, isActive? }` |

## Realtime (Socket.IO, same origin as the API)
Connect with `io(API_URL, { auth: { token } })`.

| Event | Room | Payload |
|---|---|---|
| `notification` | the user | Notification document |
| `issue:created` | staff | Full issue |
| `issue:updated` | staff | Issue (or `{ id, … }` delta) |
| `issue:changed` | everyone | `{ id, status?, upvoteCount? }` |
| `issue:deleted` | everyone | `{ id }` |

## Health
`GET /api/health` returns `{ ok, db: { connected }, storage: "cloudinary"|"local", email: "brevo"|"disabled" }`, with HTTP 503 when the database is down.
