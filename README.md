# ReclaimX — AI-Powered Campus Lost & Found

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp backend/.env.example backend/.env
# Open backend/.env and fill in all values
```

### 3. Firebase setup (see FIREBASE_SETUP.md)
- Create project at firebase.google.com
- Enable Email/Password auth
- Download serviceAccountKey.json → backend/config/
- Paste firebaseConfig into pages/login.html and pages/register.html

### 4. MongoDB Atlas
- Create free cluster at mongodb.com/atlas
- Paste connection string into backend/.env as MONGODB_URI

### 5. Cloudinary
- Create account at cloudinary.com
- Paste credentials into backend/.env

### 6. Run locally
```bash
# Backend (in project root)
node backend/server.js

# Frontend (in project root)
npx serve .
# Open http://localhost:3000/pages/login.html
```

---

## File Structure
```
RECLAIMX/
├── pages/           ← HTML pages
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── browse.html
│   ├── matches.html
│   ├── report-lost.html
│   ├── report-found.html
│   └── profile.html
├── assets/
│   ├── css/global.css    ← All styles
│   ├── js/
│   │   ├── main.js       ← Toast, utilities
│   │   └── pwa.js        ← Offline support
│   └── icons/            ← SVG icons + PWA icons
├── components/
│   ├── sidebar.html      ← Shared sidebar
│   └── toast.html        ← Toast container
├── backend/
│   ├── server.js
│   ├── config/           ← Firebase, Cloudinary
│   ├── models/           ← MongoDB schemas
│   ├── routes/           ← API endpoints
│   ├── middleware/        ← Auth guard
│   ├── ai/               ← Matching engine
│   └── utils/            ← Verification, filters
├── manifest.json
├── service-worker.js
└── package.json
```

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Save user profile to MongoDB |
| GET  | /api/auth/me | Yes | Get current user |
| GET  | /api/items | No | Browse all items |
| POST | /api/items/lost | Yes | Report lost item |
| POST | /api/items/found | Yes | Report found item |
| GET  | /api/matches | Yes | Get my matches |
| POST | /api/matches/verify | Yes | Submit verification answers |
| POST | /api/matches/confirm-handover/:id | Yes | Confirm physical handover |
| POST | /api/matches/dismiss/:id | Yes | Dismiss a match |
| GET  | /api/health | No | Health check |
# RECLAIMX
