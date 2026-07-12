# Backend API — Ogrodzenia Wielkopolska

FastAPI + Firebase Admin SDK. Jedyny punkt dostępu do Firestore.

## Wymagania

- Python 3.11+
- Klucz service account z Firebase Console

## Konfiguracja

1. Firebase Console → Project settings → Service accounts → **Generate new private key**
2. Zapisz plik jako `backend/serviceAccountKey.json` (jest w `.gitignore`)
3. Skopiuj konfigurację:

```bash
cp .env.example .env
```

## Uruchomienie

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000  
Dokumentacja: http://localhost:8000/docs

## Deploy na Render

Pełna instrukcja (Render + Vercel, komendy, checklist): **[`../DEPLOYMENT.md`](../DEPLOYMENT.md)**

Repozytorium: `https://github.com/MateuszGurgul11/ogrodzenia-wielkopolska-backend`

```bash
# Weryfikacja po deployu
curl -s https://ogrodzenia-api.onrender.com/api/health

# Aktualizacja produkcji
git add .
git commit -m "Opis zmian"
git push origin master
```

## Endpointy

| Metoda | Ścieżka | Auth |
|--------|---------|------|
| GET | `/api/health` | — |
| GET | `/api/catalog` | — |
| GET | `/api/admin/{collection}` | Bearer |
| POST | `/api/admin/{collection}` | Bearer |
| PUT | `/api/admin/{collection}/{id}` | Bearer |
| DELETE | `/api/admin/{collection}/{id}` | Bearer |
| POST | `/api/admin/seed` | Bearer |

Kolekcje: `posts`, `panels`, `spacerOptions`, `heights`, `colors`
