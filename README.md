# GoVisual AI

GoVisual AI is an intelligent creative generation platform designed for local businesses. It allows users to auto-generate branded social media creatives, minisites, product photoshoots, and video reels starting from just a Google Maps search.

## Features

- **Brand Extraction:** Instantly extract logos, brand colors, and photos from Google Places.
- **AI Prompt Engine:** An automated pipeline for assembling and optimizing T5-based prompts for visual generation.
- **Generative Media:** Auto-create professional Instagram posts, stories, and videos tailored to a brand's visual identity.
- **Minisites:** Generate micro-websites directly from the business profile.
- **Prompt Inspector:** Built-in debugging UI for validating and inspecting generative prompts.

## Current Project Status
Currently, the core scaffolding and Prompt Optimization Engine (Module 3) are complete. The backend provides a robust pipeline for validating, assembling, optimizing, and persisting prompts.

## Architecture

The system is separated into two primary applications:
1. **Frontend:** Built with Next.js (React), providing the wizard interface, dashboard, and prompt inspector.
2. **Backend:** Built with FastAPI (Python), handling AI logic, prompt assembly, and third-party integrations.

## Tech Stack
- **Frontend:** Next.js (App Router), React, TypeScript.
- **Backend:** FastAPI, Python, Pydantic, Uvicorn.
- **AI/ML:** T5 optimizations (placeholder logic for scaling to actual T5 pipeline).

## Folder Structure

```
.
├── archive/             # Archived utility scripts and datasets
├── backend/             # FastAPI application
│   ├── routes/          # API endpoint controllers
│   ├── services/        # Business logic and AI services
│   └── main.py          # Application entry point
├── frontend/            # Next.js application
│   ├── app/             # Application routes and pages
│   ├── components/      # Reusable React components
│   └── lib/             # Utility functions and store
└── README.md            # This documentation
```

## Installation

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

> **Note:** Never commit actual values to the repository.

### Backend (`backend/.env`)
- `OPENAI_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`

## Running the Project

### Running Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Running Frontend
```bash
cd frontend
npm run dev
```

## Roadmap
- [x] **Module 1:** Project setup & architecture.
- [x] **Module 2:** Intelligent Prompt Assembly Engine.
- [x] **Module 3:** Prompt Optimization & Inspector UI.
- [ ] **Module 4:** Deep Learning / Model Integration & Image Generation.
