# GoVisual AI — Complete Build Guide
## From zero to running product

---

## FOLDER STRUCTURE (create this on your computer)

```
govisual/
├── dataset/
│   └── generate_dataset.py       ← Run first
├── colab/
│   └── govisual_t5_training.py   ← Copy cells to Google Colab
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env                      ← Copy from .env.example and fill values
│   ├── watermark.png             ← Add your GoVisual logo here
│   ├── ml_model/                 ← Put trained T5 model here (from Colab)
│   └── services/
│       ├── brand.py
│       ├── t5_model.py           ← Copy from all_services.py
│       ├── gemini.py             ← Copy from all_services.py
│       ├── watermark.py          ← Copy from all_services.py
│       └── storage.py            ← Copy from all_services.py
└── frontend/
    └── (Next.js app — created by npx command)
```

---

## PHASE 1 — DATASET (Day 1, ~30 minutes)

### Step 1: Generate your training dataset
```bash
# On your computer
cd govisual/dataset
python3 generate_dataset.py
# Output: govisual_dataset.csv (400 rows)
```

### Step 2: Review the CSV
Open `govisual_dataset.csv` in Excel or Google Sheets.
Check that `input_text` and `target_text` columns look correct.
Add more rows manually for your specific city/products if desired.

---

## PHASE 2 — T5 MODEL TRAINING (Day 1-2, ~3 hours)

### Step 1: Open Google Colab
Go to: https://colab.research.google.com
Create a new notebook.
Runtime → Change runtime type → GPU → T4 (free) or A100 (paid, faster)

### Step 2: Upload dataset
Left panel → Files → Upload → select `govisual_dataset.csv`

### Step 3: Run cells in order
Copy each CELL from `colab/govisual_t5_training.py` into Colab.
Run Cell 1 (install) → Cell 2 (config) → ... → Cell 10 (save + test)

### Step 4: Download model
Run Cell 11. Your browser will download `govisual_t5_final.zip`.
Unzip it. Place contents inside `backend/ml_model/`

### Expected training time:
- T4 GPU (free): ~45 min for 400 rows
- A100 GPU:      ~15 min for 400 rows

### Target metrics (Cell 9 output):
- rouge1 > 35 ✓
- rougeL > 28 ✓
If below this, add more dataset rows and retrain.

---

## PHASE 3 — BACKEND (Day 2-3)

### Step 1: Get API keys (all free tiers work)
1. GOOGLE PLACES API:
   - Go to console.cloud.google.com
   - Create project → Enable "Places API" → Create API key
   - Free: $200 credit/month (~1000 searches free)

2. GEMINI API KEY:
   - Go to aistudio.google.com/apikey
   - Create API key (completely free to start)

3. CLOUDINARY (image hosting):
   - Go to cloudinary.com → Sign up free
   - Dashboard → Copy cloud_name, api_key, api_secret

### Step 2: Setup backend
```bash
cd govisual/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env and add your API keys
nano .env
```

### Step 3: Split all_services.py into individual service files
The file `services/all_services.py` contains 4 services.
Split it into:
- `services/t5_model.py`    (the PromptService class)
- `services/gemini.py`      (the GeminiService class)
- `services/watermark.py`   (the WatermarkService class)
- `services/storage.py`     (the StorageService class)

Also create: `services/__init__.py` (empty file)

### Step 4: Add your watermark logo
Place your GoVisual logo as `backend/watermark.png`
(transparent PNG, any size — it will be auto-scaled)

### Step 5: Run the backend
```bash
# Make sure venv is active and you're in backend/
uvicorn main:app --reload --port 8000
```

### Step 6: Test the API
Open browser: http://localhost:8000/docs
You'll see the interactive API documentation.
Test /health endpoint first — should return {"status": "ok"}

---

## PHASE 4 — FRONTEND (Day 3-4)

### Step 1: Create Next.js app
```bash
cd govisual
npx create-next-app@latest frontend --typescript --tailwind --app --no-git
cd frontend
npm install zustand
```

### Step 2: Create the files
Create these files using the code from `frontend/all_pages.js`:

```
app/page.tsx              ← LANDING constant
app/layout.tsx            ← LAYOUT constant
app/onboard/page.tsx      ← ONBOARD constant
app/wizard/page.tsx       ← WIZARD constant
app/results/page.tsx      ← RESULTS constant
lib/store.ts              ← STORE constant
lib/api.ts                ← API constant
```

### Step 3: Add environment variable
Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 4: Run frontend
```bash
# In frontend/ directory
npm run dev
```
Open http://localhost:3000

---

## RUNNING EVERYTHING TOGETHER

### Terminal 1 — Backend:
```bash
cd govisual/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend:
```bash
cd govisual/frontend
npm run dev
```

Open http://localhost:3000 and test the full flow.

---

## TESTING THE COMPLETE FLOW

1. Go to http://localhost:3000
2. Select "Electronics"
3. Type your shop name + city → select from dropdown
4. See brand preview screen (colors + photos)
5. Answer 10 wizard questions
6. Upload a product photo (any phone photo)
7. Click "Generate my creatives"
8. See 3 AI-generated watermarked images

---

## DEPLOYING TO PRODUCTION (when ready)

### Backend → Railway.app (free)
```bash
# In backend/
# Create Procfile:
echo "web: uvicorn main:app --host 0.0.0.0 --port $PORT" > Procfile

# Push to GitHub, connect to Railway
# Add environment variables in Railway dashboard
```

### Frontend → Vercel (free)
```bash
cd frontend
npx vercel
# Follow prompts, add NEXT_PUBLIC_API_URL pointing to Railway URL
```

---

## COMMON ISSUES & FIXES

| Problem | Fix |
|---|---|
| T5 model not loading | Check ml_model/ has config.json + pytorch_model.bin |
| Gemini returns text only | Use gemini-1.5-flash (not gemini-pro) |
| Brand lookup returns nothing | Check GOOGLE_PLACES_API_KEY in .env |
| Images not showing | Check Cloudinary credentials or USE_LOCAL_STORAGE=true |
| CORS error | Add your frontend URL to allow_origins in main.py |

---

## WHAT TO BUILD NEXT (after MVP works)

1. Supabase auth (phone OTP login)
2. Credit system (4 free, then ₹19/credit)
3. Razorpay payment integration
4. WhatsApp bot integration (Twilio)
5. User dashboard with history
6. More product categories
7. Auto caption generation (LLM)

---

## FILE CHECKLIST

Before running, confirm you have:
- [ ] govisual_dataset.csv generated
- [ ] T5 model trained + downloaded to backend/ml_model/
- [ ] .env file with all API keys filled
- [ ] watermark.png in backend/
- [ ] services/ folder with 4 service files + __init__.py
- [ ] frontend/.env.local with API URL
