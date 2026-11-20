# GoVisual AI — Production Deployment Guide

## 1. Architectural Overview

GoVisual AI is structured into a modern hybrid production architecture:
1. **Frontend**: Next.js 16 (App Router) deployed directly to **Vercel**.
2. **Backend**: FastAPI Python application deployed in a Docker container (with system FFmpeg) on **Railway**, **Render**, or **Google Cloud Run**.
3. **Database & Auth**: Supabase PostgreSQL with Supabase Auth (cryptographically verified HS256 JWTs).
4. **Media Storage**: Cloudinary CDN for generated creative images, photoshoots, and brand books.

---

## 2. Environment Variables

### A. Backend Variables (`backend/.env` / Container Environment)
| Variable | Description | Example / Required |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime mode: `production` or `development` | `production` |
| `SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase anon key | `eyJhbGci...` |
| `SUPABASE_JWT_SECRET`| Supabase JWT Secret (Settings -> API -> JWT Secret) | `super-secret-jwt-key...` (Required for signature verification) |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary Cloud Name | `govisual-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `1234567890` |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret | `abcdef123456` |
| `USE_LOCAL_STORAGE` | Set `false` in production to use Cloudinary | `false` |
| `OPENAI_API_KEY` | OpenAI API Key (DALL-E / GPT) | `sk-...` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIza...` |
| `GROQ_API_KEY` | Groq Llama 3 API Key (Brand Intelligence) | `gsk_...` |
| `RAZORPAY_KEY_ID` | Razorpay Merchant Key | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay Secret | `secret_...` |
| `FRONTEND_URL` | Public frontend URL for CORS | `https://your-app.vercel.app` |

### B. Frontend Variables (`frontend/.env.local` / Vercel Environment)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Deployed backend container URL | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_SUPABASE_URL`| Supabase Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase Anon Key | `eyJhbGci...` |

---

## 3. Frontend Deployment to Vercel

1. In Vercel, import the GitHub repository: `https://github.com/Lakhank123/GoVisual-AI`.
2. Configure **Root Directory**: `frontend`.
3. Set Framework Preset: **Next.js**.
4. Add the 3 environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
5. Click **Deploy**.

---

## 4. Backend Deployment via Docker (Railway / Render / Cloud Run)

### Deploying on Railway:
1. Create a new service from the GitHub repository.
2. Set root directory to `backend` (or select the provided `backend/Dockerfile`).
3. Add the Backend Environment Variables in the Railway dashboard.
4. Railway will automatically build the container with FFmpeg and Python 3.11.

### Deploying with Docker Compose Locally:
```bash
docker-compose up --build -d
```
