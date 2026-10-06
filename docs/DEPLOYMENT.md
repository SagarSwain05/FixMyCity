# Deployment guide

Target setup (all free tiers): **MongoDB Atlas** (database) · **Render** (API) · **Vercel** ×2 (citizen app and command center) · **Cloudinary** (media) · **Brevo** (email).

Do the steps in this order, because each step needs the URL from the one before it.

## 1. MongoDB Atlas
1. Create an M0 cluster (Mumbai `ap-south-1` is closest to Odisha).
2. Under *Database Access*, add a user with a strong password.
3. Under *Network Access*, add `0.0.0.0/0`. Render's free tier has no static outbound IPs.
4. Under *Connect → Drivers*, copy the URI. That is your `MONGODB_URI`.

## 2. Cloudinary
In *Dashboard → API Environment variable*, copy the `cloudinary://<key>:<secret>@<cloud>` string. That is your `CLOUDINARY_URL`.
Without it, uploads go to the API's local disk, which Render wipes on every deploy.

## 3. Brevo (optional, for status emails)
1. Under *Senders & IPs*, add and verify a sender email.
2. Under *SMTP & API → API keys*, create a key. Set `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`.

## 4. API on Render
1. *New → Blueprint*, then select this repo. `render.yaml` creates **fixmycity-api** (root `server/`, health check `/api/health`, generated `JWT_SECRET`).
2. Fill in the prompted variables:

| Variable | Value |
|---|---|
| `MONGODB_URI` | from step 1 |
| `CLOUDINARY_URL` | from step 2 |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | from step 3 (or leave empty) |
| `ADMIN_PHONE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first admin account, created on first boot |
| `PUBLIC_API_URL` | `https://fixmycity-api.onrender.com` (your service URL) |
| `CLIENT_URL` | the citizen app URL from step 5 (update after deploying it) |
| `CORS_ORIGINS` | `https://<client>.vercel.app,https://<admin>.vercel.app` (update after step 5) |

3. After the first deploy, `https://<api>/api/health` should return `"ok": true`.
4. Optional demo data: in the Render *Shell*, run `node dist/scripts/seed.js --force`.

> Free Render services sleep after 15 minutes idle, and the first request then takes about 50 s. For a demo, open `/api/health` a minute beforehand, or upgrade to Starter.

## 5. Frontends on Vercel (two projects, same repo)

| Project | Root directory | Env vars |
|---|---|---|
| `fixmycity` (citizen) | `client` | `VITE_API_URL=https://<api>.onrender.com` |
| `fixmycity-admin` | `admin` | `VITE_API_URL=https://<api>.onrender.com` |

Vercel auto-detects the Vite framework (build `npm run build`, output `dist`). `vercel.json` in each app adds SPA rewrites.

From the CLI:
```bash
cd client && vercel link && vercel env add VITE_API_URL production && vercel --prod
cd ../admin && vercel link && vercel env add VITE_API_URL production && vercel --prod
```

Then go back to Render and set `CORS_ORIGINS` and `CLIENT_URL` to the two Vercel URLs. Render redeploys automatically.

## 6. Smoke test
1. Open the admin URL and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Change the password under Settings, and check that *System status* shows Cloudinary and Brevo.
2. On a phone, open the citizen URL, sign up, and report an issue with a photo.
3. The report appears live in the admin's bell and verification queue. Verify it, and the phone gets a toast (and an email, if configured).

## Custom domains
Add the domain in Vercel (and Render, if you want `api.` there too). Then update `VITE_API_URL`, `CORS_ORIGINS`, `CLIENT_URL` and `PUBLIC_API_URL` to match.
