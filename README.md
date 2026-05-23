# Caros Slide Studio — powered by Rübibär

Plattform für Caros Coaching-Präsentationen: Roh-PPTX hochladen, Zusatz-Inhalte einfügen,
in Minuten ein CI-konformes Master-Deck zurückbekommen.

## Architektur

```
   Browser  ─►  Next.js (Vercel)  ─►  Python Engine (Render)
                     │                       │
                     └──► Supabase (Auth, DB, Storage) ◄──┘
                                  caro-slides Projekt
```

- **`app/`** — Next.js 16 (App Router, Tailwind, Supabase Auth)
- **`engine/`** — Python-PPTX-Transformer + FastAPI
- **`master/`** — Master-Design, Logo, Beispiel-Decks
- **`scripts/`** — Master-Builder + Analyse-Tools

## Lokal entwickeln

Voraussetzungen:
- Node 20+
- Python 3.9+ (`.venv` mit `python3 -m venv .venv`)
- LibreOffice (für PDF-Preview, optional): `brew install --cask libreoffice`
- Anthropic API Key in `.env` und `app/.env.local`
- Supabase Anon Key in `app/.env.local`

```bash
# 1) Python deps
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2) Engine starten (Terminal 1)
set -a && source .env && set +a
.venv/bin/uvicorn engine.server:app --host 127.0.0.1 --port 8001 --reload

# 3) Next.js starten (Terminal 2)
cd app
npm install
npm run dev

# 4) Browser
open http://localhost:3000
```

Login per Magic-Link an die eigene Mail-Adresse.

## Deployment

### Next.js → Vercel

```bash
npm i -g vercel
cd <repo root>
vercel
# Folge dem Prompt: Project link, dann Production Deploy.
# Environment Variables in Vercel-Dashboard setzen:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   ANTHROPIC_API_KEY     (NICHT NEXT_PUBLIC_)
#   PYTHON_SERVICE_URL    (https://caro-slides-engine.onrender.com)
```

### Python Engine → Render.com

1. Render-Account erstellen (https://render.com)
2. "New +" → "Blueprint" → Repo verknüpfen
3. `render.yaml` wird automatisch erkannt
4. Im Render-Dashboard `ANTHROPIC_API_KEY` als Secret Env Var setzen
5. Service-URL kopieren und in Vercel als `PYTHON_SERVICE_URL` eintragen

> **Wichtig — Timeout-Limits:**
> Eine Transformation dauert 2-5 Minuten. Vercel Hobby-Plan timeoutet API-Routes
> nach 10s, Pro nach 60s, Pro+ nach 300s. Für Production-Use empfohlen:
> - Vercel Pro+ (300s reicht meistens) ODER
> - Background-Queue-Pattern (Trigger speichern, Worker pollt → updated DB)
>
> Für lokal: läuft synchron, keine Limits.

## Tech-Stack

- Next.js 16 (App Router, Turbopack)
- Tailwind CSS v4
- Supabase (Postgres, Auth, Storage) — Projekt `caro-slides` in Frankfurt
- Python 3.9+ mit `python-pptx`
- Claude Opus 4.7 (Anthropic API) für Slide-Planning
- FastAPI für den Engine-Service
- LibreOffice (lokal) für PDF-Previews

## Design-System

Master-Design siehe [`master/caro-master-v2.pptx`](master/caro-master-v2.pptx).
- Rot: `#8F1526`
- Headlines: Cambria
- Body: Calibri
- 16:9 Widescreen
- Logo: Karrierecoach München, oben rechts

Generiert wird der Master durch `python scripts/build_master.py`. Die Render-Logik in
`engine/design.py` ist die Single Source of Truth — beide nutzen dieselben Builder.
