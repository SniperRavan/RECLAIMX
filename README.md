# ReclaimX — Smart Campus Lost & Found

<p align="center"> 
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" /> 
  <img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js" /> 
  <img src="https://img.shields.io/badge/Frontend-JavaScript-yellow?style=for-the-badge&logo=javascript" /> 
  <img src="https://img.shields.io/badge/Database-Supabase-blue?style=for-the-badge&logo=postgresql" /> 
  <img src="https://img.shields.io/badge/Auth-Firebase-orange?style=for-the-badge&logo=firebase" /> 
  <img src="https://img.shields.io/badge/PWA-Enabled-purple?style=for-the-badge" /> 
  <img src="https://img.shields.io/badge/Deployed-Vercel%20%2B%20Render-black?style=for-the-badge" /> 
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" /> 
</p>

<p align="center"> 
  <strong>Smart. Secure. Automated.</strong><br/> 
  Privacy-first campus lost & found platform with intelligent heuristic matching and fraud-proof ownership verification. 
</p>

<p align="center"> 
  <a href="https://reclaimx-chi.vercel.app">🌐 Live Demo</a> &nbsp;·&nbsp; 
  <a href="https://reclaimx.onrender.com/api/health">⚙️ API Health</a> &nbsp;·&nbsp; 
  <a href="#-getting-started">📦 Installation</a> &nbsp;·&nbsp; 
  <a href="#-contributing">🤝 Contributing</a> &nbsp;·&nbsp; 
  <a href="#-api-reference">📡 API</a>
</p>

<p align="center">
  <img src="docs/screenshots/home-page.png" alt="Home Page" width="400"/>
</p>

---

## 📑 Table of Contents

- [What is ReclaimX?](#-what-is-reclaimx)
- [✨ Key Features](#-key-features)
- [📸 Screenshots](#-screenshots)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Project Structure](#-project-structure)
- [🔧 How the Matching Engine Works](#-how-the-matching-engine-works)
- [🔒 Ownership Verification (Anti-Fraud)](#-ownership-verification-anti-fraud)
- [🏆 Trust Score System](#-trust-score-system)
- [📊 Database Schema](#-database-schema)
- [📡 API Reference](#-api-reference)
- [📦 Getting Started](#-getting-started)
- [🚀 Deployment](#-deployment)
- [🔐 Security](#-security)
- [🧪 Testing & CI](#-testing--ci)
- [🗺 Roadmap](#-roadmap)
- [👥 Team](#-team)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 What is ReclaimX?

ReclaimX replaces the traditional campus lost & found notice board with an automated, privacy-first system. Students report lost or found items, and a custom weighted scoring engine matches them in real time based on text similarity, image presence, location overlap, and time proximity.

### Key Design Goals

| Goal | Description |
|------|-------------|
| **Privacy First** | Only the item name is publicly visible. Descriptions, photos, and verification details are encrypted and private |
| **Fraud Prevention** | Ownership verified via 3 secret questions only the real owner could answer. 3 failed attempts = account suspended |
| **Trust System** | Users earn Bronze → Silver → Gold status for successful returns |
| **Works Offline** | Full PWA with service worker caching and offline submission queue |

---

## ✨ Key Features

- **Real-time Matching Engine** — Custom heuristic scoring (Jaccard similarity + location + time decay)
- **Privacy-First Design** — Sensitive data encrypted, only item names public
- **Fraud-Proof Verification** — 3 secret questions with server-side answer scoring
- **Trust Score System** — Bronze → Silver → Gold progression with points for successful returns
- **PWA Support** — Installable, works offline with service worker caching
- **Multi-Auth Providers** — Email/Password, Google, GitHub via Firebase
- **Image Upload** — Cloudinary integration for item photos
- **Multi-Campus Support** — Island-based matching by campus_id
- **Rate Limiting** — 100 requests/15 min per IP to prevent abuse
- **Sensitive Data Filter** — Blocks Aadhaar, PAN, card numbers in descriptions

---

## 📸 Screenshots

| Home Page | Login Page | Signup Page |
|---|---|---|
| ![Home Page](docs/screenshots/home.png) | ![Login Page](docs/screenshots/login.png) | ![Signup Page](docs/screenshots/signup.png) |

| Dashboard | Browse Items |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Browse](docs/screenshots/browse.png) |

| My Matches | Report Lost Item |
|---|---|
| ![Matches](docs/screenshots/matches.png) | ![Report Lost](docs/screenshots/report-lost.png) |

| Report Found Item | Profile |
|---|---|
| ![Report Found](docs/screenshots/report-found.png) | ![Profile](docs/screenshots/profile.png) |

📁 Full-resolution screenshots live in `docs/screenshots/`.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES Modules) |
| **PWA** | Service Worker + Web App Manifest |
| **Auth** | Firebase Auth (Email/Password, Google, GitHub) |
| **Backend** | Node.js + Express.js |
| **Database** | Supabase (PostgreSQL) |
| **Image Storage** | Cloudinary v2 |
| **Matching Engine** | Custom heuristic scoring (Jaccard similarity + location + time decay) |
| **Security** | Helmet.js, express-rate-limit, Firebase ID token verification |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Render |

---

## 🏗 Project Structure
```
RECLAIMX/
├── frontend/ ← Deployed on Vercel (root dir: frontend/)
│ ├── index.html ← Public landing page
│ ├── manifest.json ← PWA manifest
│ ├── service-worker.js ← Offline caching
│ ├── vercel.json ← Clean URL rewrites + cache headers
│ ├── .env.example ← No secrets needed for frontend
│ │
│ ├── pages/
│ │ ├── login.html
│ │ ├── register.html
│ │ ├── dashboard.html ← Stats, recent activity, my reports
│ │ ├── browse.html ← Public browse with search/filter
│ │ ├── report-lost.html ← Hidden verification attributes
│ │ ├── report-found.html
│ │ ├── matches.html ← Score ring, verify claim flow
│ │ ├── profile.html ← Avatar, trust score, activity
│ │ └── 404.html
│ │
│ ├── assets/
│ │ ├── css/global.css ← Full design system (dark theme)
│ │ ├── js/
│ │ │ ├── main.js ← API_BASE, toast, sidebar init
│ │ │ ├── auth-guard.js ← Back/forward button bypass (bfcache)
│ │ │ ├── auth.js ← Session guard, token refresh
│ │ │ ├── firebase-config.js ← Loads config from backend
│ │ │ └── pwa.js ← SW registration, offline queue
│ │ └── icons/
│ │
│ └── components/
│ ├── sidebar.html ← Injected via fetch() on every page
│ └── toast.html ← Rich toast with progress bar
│
└── backend/ ← Deployed on Render (root dir: backend/)
├── server.js ← Express entry point (port 5000)
├── package.json
├── .env ← Secrets — never commit
├── .env.example
│
├── config/
│ ├── firebase.js ← Firebase Admin SDK
│ ├── supabase.js ← Supabase service_role client
│ ├── cloudinary.js ← Cloudinary v2 + multer memoryStorage
│ └── serviceAccountKey.json ← Firebase key — never commit
│
├── middleware/
│ ├── authMiddleware.js ← Firebase token verification
│ └── errorHandler.js ← Global error + 404 handler
│
├── routes/
│ ├── authRoutes.js ← /api/auth/*
│ ├── itemRoutes.js ← /api/items/*
│ ├── matchRoutes.js ← /api/matches/*
│ └── configRoutes.js ← /api/config/firebase
│
├── ai/
│ └── matchingEngine.js ← Heuristic scoring engine
│
└── utils/
├── verificationEngine.js ← Ownership answer scoring
├── sensitiveDataFilter.js ← Blocks Aadhaar, PAN, card numbers
└── emailService.js ← Resend email notifications (planned)

```


### Quick Runtime Reference

| Component | Port | Entry Point | Hosting |
|-----------|------|-------------|---------|
| Frontend | 3000 (local) | `frontend/index.html` | Vercel |
| Backend | 5000 (local) | `backend/server.js` | Render |
| API Root | `http://localhost:5000/api` | — | — |

---

## 🔧 How the Matching Engine Works

When a lost or found item is submitted, the engine queries all open opposing items on the same campus with the same category, then scores each pair:

### Final Score Formula

\[
\text{Final Score} = (\text{Text} \times 40\%) + (\text{Image} \times 30\%) + (\text{Location} \times 20\%) + (\text{Time} \times 10\%)
\]

| Signal | Method |
|--------|--------|
| **Text** | Jaccard similarity on item name (70%) + description (30%) |
| **Image** | Presence score — 65 if both have images, 40 if one, 20 if neither |
| **Location** | Token overlap between last-seen and found locations |
| **Time decay** | Linear decay over 72 hours — older reports score lower |

A claim is created only if **score ≥ 40** and **campus + category both match exactly**.

> ⚠️ Note: Image signal is a presence placeholder. Vector embedding similarity (MobileNet + pgvector) is planned for v2.

---

## 🔒 Ownership Verification (Anti-Fraud)

After a match is created, the claimer answers 3 questions drawn from private hidden attributes:

1. **Interior colour / lining**
2. **Unique marks, scratches, stickers, or engravings**
3. **What the item contains**

Answers checked server-side using Jaccard word similarity:
- **Score ≥ 60%** → verified
- **Below 60%** → strike logged
- **3 strikes** → account suspended

---

## 🏆 Trust Score System

| Level | Points | Notes |
|-------|--------|-------|
| 🥉 **Bronze Helper** | 0–49 pts | Default on signup |
| 🥈 **Silver Helper** | 50–99 pts | Trusted member |
| 🥇 **Gold Hero** | 100+ pts | Campus hero |

+10 points awarded to both parties on each successful item return.

---

## 📊 Database Schema (Supabase / PostgreSQL)

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  campus_id TEXT DEFAULT 'campus_a',
  photo TEXT DEFAULT '',
  trust_score INTEGER DEFAULT 0,
  trust_level TEXT DEFAULT 'Bronze',
  failed_claims INTEGER DEFAULT 0,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lost_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  campus_id TEXT NOT NULL,
  item_name TEXT NOT NULL,          -- PUBLIC
  description TEXT,                 -- PRIVATE
  category TEXT,
  last_seen_location TEXT,          -- PUBLIC
  image_urls TEXT[] DEFAULT '{}',   -- PRIVATE
  hidden_color_inside TEXT,         -- PRIVATE (verification)
  hidden_unique_marks TEXT,         -- PRIVATE (verification)
  hidden_contains TEXT,             -- PRIVATE (verification)
  status TEXT DEFAULT 'Lost',       -- Lost \[|\] Pending \[|\] Resolved
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE found_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  campus_id TEXT NOT NULL,
  item_name TEXT NOT NULL,          -- PUBLIC
  description TEXT,                 -- PRIVATE
  category TEXT,
  found_location TEXT,              -- PUBLIC
  image_url TEXT DEFAULT '',        -- PRIVATE
  status TEXT DEFAULT 'Found',      -- Found \[|\] Resolved
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lost_item_id UUID REFERENCES lost_items(id),
  found_item_id UUID REFERENCES found_items(id),
  claimant_id UUID REFERENCES users(id),
  match_score FLOAT DEFAULT 0,
  answer_1 TEXT, answer_2 TEXT, answer_3 TEXT,
  verification_score FLOAT DEFAULT 0,
  loster_confirmed BOOLEAN DEFAULT false,
  founder_confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Pending',    -- Pending \[|\] Verified \[|\] Rejected \[|\] Resolved
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> ⚠️ Use the **service_role key** in your backend `.env`, not the anon key. The anon key will be blocked by Row Level Security.

---

## 📡 API Reference

Base URL: `https://reclaimx.onrender.com/api` (production) or `http://localhost:5000/api` (local)

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/session` | — | Verify Firebase token + upsert user |
| GET | `/me` | ✅ | Get current user profile |
| PUT | `/profile` | ✅ | Update display name / clear photo |
| POST | `/avatar` | ✅ | Upload profile photo to Cloudinary |
| POST | `/forgot-password` | — | Send Firebase password reset email |

### Items — `/api/items`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | Browse open lost & found items |
| GET | `/me` | ✅ | Get current user's reports |
| POST | `/lost` | ✅ | Report a lost item (triggers matching) |
| POST | `/found` | ✅ | Report a found item (triggers matching) |
| DELETE | `/lost/:id` | ✅ | Delete own lost report |
| DELETE | `/found/:id` | ✅ | Delete own found report |

### Matches — `/api/matches`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get all claims for current user |
| POST | `/verify` | ✅ | Submit ownership verification answers |
| POST | `/confirm-handover/:id` | ✅ | Confirm physical handover |
| POST | `/dismiss/:id` | ✅ | Dismiss a match |

### Config & Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/config/firebase` | — | Firebase client config (safe to expose) |
| GET | `/api/health` | — | Server health check |

---

## 🧪 Complete cURL Examples

### 1. Verify Firebase Token & Create Session

```bash
curl -X POST https://reclaimx.onrender.com/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "YOUR_FIREBASE_ID_TOKEN_HERE"
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "firebase_uid": "firebase-uid",
    "name": "John Doe",
    "email": "john@example.com",
    "campus_id": "campus_a",
    "trust_score": 0,
    "trust_level": "Bronze"
  }
}
```

---

### 2. Get Current User Profile

```bash
curl -X GET https://reclaimx.onrender.com/api/auth/me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "firebase_uid": "firebase-uid",
    "name": "John Doe",
    "email": "john@example.com",
    "campus_id": "campus_a",
    "photo": "",
    "trust_score": 10,
    "trust_level": "Bronze",
    "failed_claims": 0,
    "is_suspended": false
  }
}
```

---

### 3. Report a Lost Item

```bash
curl -X POST https://reclaimx.onrender.com/api/items/lost \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -d '{
    "campus_id": "campus_a",
    "item_name": "iPhone 13 Pro",
    "description": "Midnight green, 128GB, has a crack on the back",
    "category": "Electronics",
    "last_seen_location": "Library Floor 2",
    "hidden_color_inside": "Black leather lining",
    "hidden_unique_marks": "Crack on back near camera, Apple sticker on case",
    "hidden_contains": "AirPods Pro case, USB-C cable, phone manual"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Lost item reported successfully",
  "item": {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "campus_id": "campus_a",
    "item_name": "iPhone 13 Pro",
    "category": "Electronics",
    "last_seen_location": "Library Floor 2",
    "status": "Lost",
    "created_at": "2026-06-04T11:00:00.000Z"
  },
  "matches_found": 1,
  "matches": [
    {
      "claim_id": "claim-uuid",
      "found_item_id": "found-uuid",
      "match_score": 67.5,
      "founder_name": "Jane Smith"
    }
  ]
}
```

---

### 4. Report a Found Item

```bash
curl -X POST https://reclaimx.onrender.com/api/items/found \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -d '{
    "campus_id": "campus_a",
    "item_name": "iPhone 13 Pro",
    "description": "Found near library, midnight green color",
    "category": "Electronics",
    "found_location": "Library Floor 2"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Found item reported successfully",
  "item": {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "campus_id": "campus_a",
    "item_name": "iPhone 13 Pro",
    "category": "Electronics",
    "found_location": "Library Floor 2",
    "status": "Found",
    "created_at": "2026-06-04T11:00:00.000Z"
  },
  "matches_found": 1,
  "matches": [
    {
      "claim_id": "claim-uuid",
      "lost_item_id": "lost-uuid",
      "match_score": 67.5,
      "loster_name": "John Doe"
    }
  ]
}
```

---

### 5. Browse All Open Items

```bash
curl -X GET "https://reclaimx.onrender.com/api/items?campus_id=campus_a&category=Electronics"
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-1",
      "item_name": "iPhone 13 Pro",
      "category": "Electronics",
      "last_seen_location": "Library Floor 2",
      "status": "Lost",
      "created_at": "2026-06-04T10:00:00.000Z",
      "has_image": true
    },
    {
      "id": "uuid-2",
      "item_name": "iPhone 13 Pro",
      "category": "Electronics",
      "found_location": "Library Floor 2",
      "status": "Found",
      "created_at": "2026-06-04T11:00:00.000Z",
      "has_image": false
    }
  ],
  "total": 2
}
```

---

### 6. Submit Ownership Verification Answers

```bash
curl -X POST https://reclaimx.onrender.com/api/matches/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -d '{
    "claim_id": "claim-uuid-here",
    "answer_1": "Black leather lining",
    "answer_2": "Crack on back near camera, Apple sticker",
    "answer_3": "AirPods Pro case and USB-C cable"
  }'
```

**Response (Verified):**
```json
{
  "success": true,
  "message": "Ownership verified successfully",
  "claim": {
    "id": "claim-uuid",
    "verification_score": 78.5,
    "status": "Verified"
  },
  "trust_score_updated": {
    "previous": 10,
    "current": 20
  }
}
```

**Response (Not Verified):**
```json
{
  "success": false,
  "message": "Verification failed — answers do not match",
  "claim": {
    "id": "claim-uuid",
    "verification_score": 45.2,
    "status": "Pending",
    "failed_attempts": 1,
    "remaining_attempts": 2
  }
}
```

---

### 7. Confirm Physical Handover

```bash
curl -X POST https://reclaimx.onrender.com/api/matches/confirm-handover/claim-uuid-here \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "message": "Handover confirmed — both parties rewarded",
  "claim": {
    "id": "claim-uuid",
    "status": "Resolved",
    "loster_confirmed": true,
    "founder_confirmed": true
  },
  "trust_score_updates": {
    "loster": {
      "previous": 10,
      "current": 20
    },
    "founder": {
      "previous": 15,
      "current": 25
    }
  }
}
```

---

### 8. Dismiss a Match

```bash
curl -X POST https://reclaimx.onrender.com/api/matches/dismiss/claim-uuid-here \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Not my item"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Match dismissed successfully",
  "claim": {
    "id": "claim-uuid",
    "status": "Rejected"
  }
}
```

---

### 9. Get All Your Claims

```bash
curl -X GET https://reclaimx.onrender.com/api/matches \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "claims": [
    {
      "id": "claim-uuid",
      "lost_item_id": "lost-uuid",
      "found_item_id": "found-uuid",
      "match_score": 67.5,
      "verification_score": 78.5,
      "status": "Pending",
      "item_name": "iPhone 13 Pro",
      "category": "Electronics",
      "created_at": "2026-06-04T11:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 10. Update Profile Name

```bash
curl -X PUT https://reclaimx.onrender.com/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN_HERE" \
  -d '{
    "name": "John Doe Updated"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid-here",
    "name": "John Doe Updated",
    "email": "john@example.com"
  }
}
```

---

### 11. Health Check

```bash
curl -X GET https://reclaimx.onrender.com/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-04T11:30:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "firebase": "connected",
  "cloudinary": "connected"
}
```

---

### 12. Get Firebase Client Config (Public)

```bash
curl -X GET https://reclaimx.onrender.com/api/config/firebase
```

**Response:**
```json
{
  "success": true,
  "firebaseConfig": {
    "apiKey": "AIza...",
    "authDomain": "reclaimx.firebaseapp.com",
    "projectId": "reclaimx",
    "storageBucket": "reclaimx.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abc123"
  }
}
```

---

## 📦 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm or yarn
- Firebase project (Email/Password + Google + GitHub auth enabled)
- Supabase project
- Cloudinary account

### 1. Clone & Install

```bash
git clone https://github.com/SniperRavan/RECLAIMX.git
cd RECLAIMX
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `backend/.env` and fill in these values:

```env
# Server
PORT=5000
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS (optional)
CORS_ORIGIN=http://localhost:3000
```

> ⚠️ **Never commit `.env` or `serviceAccountKey.json`** — they're in `.gitignore`.

### 4. Firebase Admin Key

1. Go to **Firebase Console → Project Settings → Service Accounts**
2. Click **Generate New Private Key**
3. Save as `backend/config/serviceAccountKey.json`

### 5. Apply Supabase Schema

1. Open your Supabase project's **SQL Editor**
2. Paste the full [Database Schema](#-database-schema) SQL from above
3. Click **Run**

### 6. Run Locally

**Terminal 1 — Backend (port 5000):**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 3000):**

```bash
cd frontend
npx serve . -l 3000
```

Open **http://localhost:3000** in your browser.

---

## 🚀 Deployment

### Vercel (Frontend)

1. Go to [Vercel](https://vercel.com)
2. Import your repo
3. Settings:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: (leave empty)
   - **Output Directory**: `.`
4. No environment variables needed for frontend
5. Deploy

### Render (Backend)

1. Go to [Render](https://render.com)
2. New **Web Service**
3. Settings:
   - **Root Directory**: `backend`
   - **Start Command**: `node server.js`
   - **Environment**:
     ```
     PORT=5000
     NODE_ENV=production
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     CLOUDINARY_CLOUD_NAME=your-cloud-name
     CLOUDINARY_API_KEY=your-api-key
     CLOUDINARY_API_SECRET=your-api-secret
     CORS_ORIGIN=https://reclaimx-chi.vercel.app
     ```
4. Deploy

---

## 🔐 Security

| Measure | Description |
|---------|-------------|
| **Secrets Management** | All secrets in `backend/.env` — never in frontend HTML |
| **Firebase Config** | Served from backend endpoint — safe public config, not admin keys |
| **Sensitive Data Filter** | Blocks Aadhaar, PAN, card numbers in descriptions |
| **Security Headers** | Helmet.js sets strict headers on all responses |
| **Rate Limiting** | 100 requests / 15 min per IP (trust proxy enabled for Render) |
| **Token Verification** | Firebase ID token verified server-side on every protected route |
| **Database Access** | Supabase service role key is backend-only only |
| **File Ignored** | `.env`, `serviceAccountKey.json` in `.gitignore` |

### Secret Rotation Best Practices

- Rotate Firebase private key every 90 days
- Rotate Supabase service role key if compromised
- Use Render/Vercel secret management (not plain `.env` in prod)
- Enable secret scanning in GitHub repo settings

---

## 🧪 Testing & CI

### Running Tests (Current Status)

⚠️ **Tests are not yet implemented** — this is a TODO for v1.1.

### Planned Testing Stack

- **Backend**: Jest + Supertest for API endpoint tests
- **Frontend**: Vitest + Testing Library for component tests
- **E2E**: Playwright for critical user flows (login → report → match → verify)

### How to Add Tests (Contributor Guide)

1. Install dev dependencies:
   ```bash
   cd backend
   npm install --save-dev jest supertest
   ```
2. Create `backend/tests/api.test.js`
3. Add test:
   ```javascript
   const request = require('supertest');
   const app = require('../server');

   describe('GET /api/health', () => {
     it('should return 200 OK', async () => {
       const response = await request(app).get('/api/health');
       expect(response.status).toBe(200);
       expect(response.body.status).toBe('ok');
     });
   });
   ```
4. Run: `npm test`

### CI Pipeline (Planned — GitHub Actions)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run lint
```

---

## 🗺 Roadmap

| Priority | Feature | Status | Target |
|----------|---------|--------|--------|
| 🔴 High | Image similarity via vector embeddings (MobileNet + pgvector) | ❌ Todo | v2.0 |
| 🔴 High | Full Supabase RLS policies | ❌ Todo | v1.1 |
| 🟡 Medium | Email notifications on match creation (Resend integration) | ❌ Todo | v1.2 |
| 🟡 Medium | Verification modal UI in `matches.html` | ❌ Todo | v1.1 |
| 🟡 Medium | Admin dashboard for campus coordinators | ❌ Todo | v2.0 |
| 🟢 Low | Mobile app (React Native / Flutter) | ❌ Todo | v3.0 |
| 🟢 Low | Accessibility improvements (WCAG 2.1 AA) | ❌ Todo | v1.2 |
| 🟢 Low | Multi-language support (English + Hindi) | ❌ Todo | v2.0 |

---

## 👥 Team

| Role | Name | GitHub |
|------|------|--------|
| **Lead Developer** | Sniper Ravan | [@SniperRavan](https://github.com/SniperRavan) |
| **Team Member** | Member 2 | [Add GitHub](https://github.com/) |
| **Team Member** | Member 3 | [Add GitHub](https://github.com/) |

- **Institution**: Private Institute
- **Project Type**: Final Year Project
- **Supervisor**: [Add Supervisor Name]

---

## 🤝 Contributing

We welcome contributions! This section explains how to get started, our workflow, and expectations.

### How to Contribute

1. **Fork the repository**
   - Click **Fork** at the top-right of the repo page
   - You'll get `https://github.com/YOUR_USERNAME/RECLAIMX.git`

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/RECLAIMX.git
   cd RECLAIMX
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/SniperRavan/RECLAIMX.git
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   **Branch naming convention:**
   - `feature/add-dark-mode-toggle`
   - `fix/resolve-login-bug`
   - `docs/update-api-reference`
   - `test/add-backend-tests`

5. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

6. **Test your changes**
   ```bash
   cd backend
   npm run lint
   # TODO: npm test (once tests are added)
   ```

7. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add dark mode toggle button"
   ```
   **Commit message convention (Conventional Commits):**
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `docs:` — Documentation changes
   - `style:` — Code style (formatting, semicolons)
   - `refactor:` — Code refactoring (no feature change)
   - `test:` — Adding tests
   - `chore:` — Maintenance (deps, build tools)

8. **Sync with upstream** (before pushing)
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

9. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

10. **Open a Pull Request**
    - Go to your fork on GitHub
    - Click **Compare & pull request**
    - Select **base repository**: `SniperRavan/RECLAIMX`
    - Select **base branch**: `main`
    - Fill in the PR template below

### Pull Request Template

Copy this into your PR description:

```markdown
## Description
<!-- Briefly describe what this PR does -->

## Related Issue
<!-- Link to issue number if applicable -->
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing Done
<!-- Describe how you tested this -->
- [ ] Local testing completed
- [ ] Screenshots attached (if UI change)
- [ ] New tests added (if applicable)

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests passed
```

### Code Style Guidelines

- **Frontend**: Vanilla JS, ES Modules, no frameworks
- **Backend**: Express.js, async/await, error handling
- **Naming**:
  - Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `kebab-case.html`, `kebab-case.js`
- **Comments**: JSDoc for functions, inline comments for complex logic
- **Indentation**: 2 spaces (HTML, CSS, JS)
- **Quotes**: Single quotes `'` for JS, double quotes `"` for JSON

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Accept constructive criticism
- Focus on what's best for the community

### Getting Help

- Open an issue for bugs or questions
- Tag issues with appropriate labels (`bug`, `enhancement`, `question`)
- Join discussions in GitHub Discussions tab

### Review Process

1. Maintainer reviews your PR within 3–5 business days
2. Feedback may be given — address comments and push updates
3. Once approved, PR is merged into `main`
4. Your contribution is credited in `CONTRIBUTORS.md`

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for full text.

**Brief summary:** You're free to use, modify, and distribute this project for any purpose, including commercial use, as long as you include the original copyright notice and license text.

---

## 🙏 Acknowledgments

- Firebase for authentication
- Supabase for database
- Cloudinary for image storage
- Vercel & Render for hosting
- MIT License for open-source freedom

---

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&weight=700&size=32&duration=2500&pause=800&color=00F7FF&center=true&vCenter=true&width=1000&lines=ReclaimX+🚀;AI-Powered+Lost+%26+Found;Smart+Matching+Engine;Secure+%26+Privacy-First;Full-Stack+Innovation" />
</p>

<p align="center">
  <strong>Built with ❤️ by Sniper Ravan and team</strong><br/>
  <a href="https://github.com/SniperRavan/RECLAIMX">GitHub</a> · 
  <a href="https://reclaimx-chi.vercel.app">Live Demo</a> · 
  <a href="#-contributing">Contribute</a>
</p>
