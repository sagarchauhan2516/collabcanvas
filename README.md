# CollabCanvas 🎨

> **Real-time collaborative whiteboard with AI-powered layout generation**

CollabCanvas solves a core problem in remote design teams: **there is no shared creative space that combines real-time collaboration, intelligent AI generation, and zero-friction accessibility**. Design tools like Figma are complex; chat tools lack visual structure; and AI generation tools don't support real-time multi-user editing.

CollabCanvas bridges all three — a live drawing canvas where multiple users see each other's cursors in real-time, powered by Gemini AI that generates professional diagrams and layouts from natural language.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🎨 **Infinite Canvas** | Pan, zoom, and draw with 15+ element types |
| 👥 **Real-time Collaboration** | Live cursors, instant element sync via Socket.io |
| 🤖 **Gemini AI Generation** | Generate diagrams from text prompts or images |
| 🔥 **Firebase Auth** | Google Sign-In + Anonymous (Guest) access |
| ☁️ **Cloud Projects** | Firestore-backed project save/load for signed-in users |
| 📊 **Analytics** | Firebase Analytics tracks feature usage |
| 📐 **Smart Alignment** | Snap-to-grid, guides, alignment tools |
| 🖼️ **Canvas-to-Code** | AI converts whiteboard to React/Tailwind code |
| 📱 **Accessible** | WCAG-compliant: ARIA roles, keyboard nav, skip links |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (React + Vite)              │
│  ┌─────────────┐   ┌──────────────┐  ┌───────────┐  │
│  │  Canvas UI  │   │  Firebase SDK │  │ Socket.io │  │
│  │ (Konva.js)  │   │  Auth + Store │  │  Client   │  │
│  └──────┬──────┘   └──────┬───────┘  └─────┬─────┘  │
└─────────┼─────────────────┼────────────────┼─────────┘
          │                  │                │
          ▼                  ▼                ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│  Express Server  │  │   Firebase   │  │  Socket.io   │
│  (Node + TSX)    │  │   Platform   │  │   Server     │
│  /api/generate   │  │  Auth, RTDB  │  │  Collab sync │
│  /api/gen-code   │  │  Firestore   │  │              │
│  helmet + limiter│  │  Analytics   │  │              │
└────────┬─────────┘  └──────────────┘  └──────────────┘
         │
         ▼
 ┌──────────────┐
 │  Gemini API  │
 │ (Google AI)  │
 └──────────────┘
```

---

## 🛠️ Google Services Used

| Service | Usage |
|---|---|
| **Gemini API** (`gemini-2.0-flash`) | AI diagram generation and canvas-to-code conversion |
| **Firebase Authentication** | Google Sign-In + Anonymous auth |
| **Cloud Firestore** | Persistent cloud project storage per user |
| **Firebase Analytics** | Event tracking (element add, AI use, exports, etc.) |
| **Firebase Hosting** | Production deployment (configured) |

---

## 🔐 Security

- **Helmet.js** — Strict HTTP security headers (CSP, HSTS, X-Frame-Options)
- **express-rate-limit** — 50 req/15min on AI endpoints
- **express-validator** — Server-side input validation & sanitization  
- **Socket.io rate limiting** — Per-socket event throttling
- **Input sanitization** — XSS protection on all user-supplied text
- **Firestore security rules** — User-scoped data access only

---

## ♿ Accessibility

- Skip navigation link for keyboard users
- Semantic HTML (`<header>`, `<main>`, `<aside>`, `<nav>`)
- ARIA roles and labels on all interactive elements
- `aria-live` regions for dynamic loading announcements
- `aria-hidden` on decorative elements
- `prefers-reduced-motion` support
- `forced-colors` / high-contrast mode support
- `:focus-visible` keyboard focus indicators

---

## 🔧 Setup

```bash
# Clone
git clone https://github.com/sagarchauhan2516/collabcanvas

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start development server
npm run dev
```

Visit `http://localhost:3001`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests cover:
- Canvas utility functions (`getElementRect`, `rectIntersect`, `isPointInside`)
- Server validation logic (`validateElement`, `isRateLimited`)
- `useCanvasState` hook (history, undo/redo, property updates)
- React components (CodePreviewModal, ErrorBoundary, App landing)

---

## 🐳 Docker

```bash
docker build -t collabcanvas .
docker run -p 3001:3001 -e GEMINI_API_KEY=your_key collabcanvas
```

---

## ☁️ Google Cloud Run Deployment

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/collabcanvas
gcloud run deploy collabcanvas \
  --image gcr.io/YOUR_PROJECT/collabcanvas \
  --platform managed \
  --region us-central1 \
  --session-affinity
```

---

## 📂 Project Structure

```
collabcanvas/
├── server.ts                 # Express + Socket.io + Gemini API
├── src/
│   ├── App.tsx               # Main application (3900+ lines)
│   ├── firebase.ts           # Firebase Auth + Firestore + Analytics
│   ├── types.ts              # TypeScript type definitions
│   ├── templates.ts          # Preset diagram templates
│   ├── components/
│   │   ├── canvas/           # CanvasShape, CanvasExtras
│   │   ├── ui/               # CodePreviewModal, ToolbarComponents
│   │   └── ErrorBoundary.tsx # React error boundary
│   ├── hooks/
│   │   ├── useCanvasState.ts # Canvas state management hook
│   │   └── useSocket.ts      # Socket.io hook
│   └── tests/
│       ├── setup.ts          # Vitest setup
│       ├── utils.test.ts     # Utility function tests
│       ├── useCanvasState.test.ts
│       └── App.test.tsx      # Component integration tests
├── firestore.rules           # Firestore security rules
├── firebase.json             # Firebase configuration
├── Dockerfile
└── vitest.config.ts
```

---

## 📄 License

Apache-2.0 — See LICENSE for details.
