# Konfigurator ogrodzeń betonowych — Wielkopolska

Aplikacja webowa do konfiguracji ogrodzeń betonowych w 2D z panelem administracyjnym.

- **Frontend:** Next.js (konfigurator + panel admina)
- **Backend:** FastAPI + Firebase Admin SDK (Firestore)
- **Auth:** Firebase Authentication (e-mail/hasło) — token ID wysyłany do API

## Funkcje

- **Konfigurator** (`/`) — wybór elementów ogrodzenia z podglądem SVG na żywo
- **Panel admina** (`/admin`) — CRUD wariantów przez REST API
- **Tryb demo** — gdy API niedostępne, konfigurator używa danych przykładowych

## Wymagania

- Node.js 20+
- Python 3.11+
- Projekt [Firebase](https://console.firebase.google.com)

## Konfiguracja

### 1. Firebase

1. Utwórz projekt w Firebase Console.
2. **Authentication** → Sign-in method → **Email/Password**.
3. **Authentication** → Users → dodaj konto admina.
4. **Firestore Database** → utwórz bazę.
5. Wgraj reguły z [`firestore.rules`](firestore.rules) (dostęp tylko przez service account).
6. **Project settings** → Service accounts → **Generate new private key** → zapisz jako `backend/serviceAccountKey.json`.
7. **Project settings** → Web app → skopiuj config do `.env`.

### 2. Zmienne środowiskowe

```bash
cp .env.example .env
```

Uzupełnij `.env` (frontend):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend (`backend/.env`):

```bash
cd backend && cp .env.example .env
```

## Uruchomienie

**Terminal 1 — backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
npm install
npm run dev
```

- Konfigurator: http://localhost:3000
- Panel admina: http://localhost:3000/admin/login
- API docs: http://localhost:8000/docs

Po logowaniu użyj **Wgraj dane przykładowe** na dashboardzie admina.

## Architektura API

| Metoda | Ścieżka | Auth |
|--------|---------|------|
| GET | `/api/catalog` | — |
| GET | `/api/admin/{collection}` | Bearer (Firebase ID token) |
| POST/PUT/DELETE | `/api/admin/...` | Bearer |

Szczegóły: [`backend/README.md`](backend/README.md)

## Struktura Firestore

| Kolekcja | Opis |
|----------|------|
| `posts` | Słupki |
| `panels` | Panele (wzory SVG) |
| `spacerOptions` | Dystans / ażurowość |
| `heights` | Wysokości (1–2,25 m) |
| `colors` | Kolory (`#RRGGBB`) |

Pola opcjonalne: `description`, `previewAsset` (URL zdjęcia).

## Produkcja (Vercel + Render)

Szczegółowa instrukcja deployu z komendami: **[`DEPLOYMENT.md`](DEPLOYMENT.md)**

| Warstwa | Hosting | Repo GitHub |
|---------|---------|-------------|
| Frontend | [Vercel](https://vercel.com) | `ogrodzenia-wielkopolska` → gałąź `main` |
| Backend API | [Render](https://render.com) | `ogrodzenia-wielkopolska-backend` → gałąź `master` |

Szybki test po deployu:

```bash
curl -s https://TWOJ-API.onrender.com/api/health
```

Na Vercel ustaw `NEXT_PUBLIC_API_URL` na URL API z Rendera i zrób redeploy.
