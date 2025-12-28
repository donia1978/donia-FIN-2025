# DONIA â€” E-Learning Final Pack

## Env
Ensure in .env:
- VITE_SUPABASE_URL=...
- VITE_SUPABASE_PUBLISHABLE_KEY=...
- VITE_AI_GATEWAY_URL=http://localhost:5188
- VITE_SIGNALING_URL=http://localhost:5179

## Install deps (if warned)
npm i jspdf socket.io-client

## Run
npm run dev
Open:
- /teacher  (seed + manage)
- /courses  (catalog)
- /exams    (AI)
- /certificates (PDF)
- /live     (WebRTC MVP)