# Deployment — Vercel (frontend) + Render (backend)

## Architektura produkcyjna

```text
Użytkownik
    │
    ▼
Vercel (Next.js)                    Render (FastAPI + Docker)
ogrodzenia-wielkopolska.vercel.app  ogrodzenia-api.onrender.com
    │                                       │
    │  NEXT_PUBLIC_API_URL ─────────────────┘
    │
    └── Firebase Auth (logowanie admina w przeglądarce)
              │
              ▼
        Firestore (dane katalogu, wariantów, cen)
              ▲
              │
        Backend na Renderze (service account)
```

| Warstwa | Hosting | Repozytorium GitHub | Gałąź |
|---------|---------|---------------------|-------|
| Frontend | Vercel | `MateuszGurgul11/ogrodzenia-wielkopolska` | `main` |
| Backend API | Render | `MateuszGurgul11/ogrodzenia-wielkopolska-backend` | `master` |

---

## Wymagania wstępne

1. Konto [GitHub](https://github.com) z wypchniętym kodem.
2. Konto [Vercel](https://vercel.com) (logowanie przez GitHub).
3. Konto [Render](https://render.com) (logowanie przez GitHub).
4. Projekt [Firebase](https://console.firebase.google.com):
   - Authentication → Email/Password włączone
   - Firestore Database utworzona
   - Service account key (JSON) — **nigdy nie commituj do Git**

---

## 1. Backend na Renderze

### Opcja A — osobne repo backendu (zalecane)

Repozytorium: https://github.com/MateuszGurgul11/ogrodzenia-wielkopolska-backend

Plik `render.yaml` jest w katalogu głównym tego repo.

#### Krok 1: Przygotuj JSON service account (jedna linia)

Lokalnie (macOS/Linux):

```bash
cd backend
python3 -c "import json; print(json.dumps(json.load(open('serviceAccountKey.json'))))" | pbcopy
```

Skopiowany tekst wkleisz w Render jako `FIREBASE_SERVICE_ACCOUNT_JSON`.

Alternatywnie ręcznie: otwórz `serviceAccountKey.json`, skopiuj cały plik i usuń przełamania linii (musi być jedna linia JSON).

#### Krok 2: Utwórz usługę w Render (panel WWW)

1. Wejdź na https://dashboard.render.com
2. **New +** → **Blueprint**
3. Połącz repo `ogrodzenia-wielkopolska-backend`
4. Render wykryje `render.yaml` i zaproponuje usługę `ogrodzenia-api`
5. Ustaw zmienne (Render poprosi przy pierwszym deployu):

| Zmienna | Wartość |
|---------|---------|
| `FIREBASE_PROJECT_ID` | `ogrodzenia-wielkopolska` (lub Twój project ID z Firebase) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | cały JSON service account w **jednej linii** |
| `CORS_ORIGINS` | `https://ogrodzenia-wielkopolska.vercel.app` |
| `PORT` | `8000` (ustawione w `render.yaml`) |

6. Kliknij **Apply** / **Create**

#### Krok 3: Sprawdź deploy

Po zakończeniu buildu skopiuj URL usługi, np.:

```text
https://ogrodzenia-api.onrender.com
```

W terminalu:

```bash
curl -s https://ogrodzenia-api.onrender.com/api/health
```

Oczekiwana odpowiedź (status OK):

```json
{"status":"ok"}
```

Katalog publiczny:

```bash
curl -s https://ogrodzenia-api.onrender.com/api/catalog | head -c 200
```

#### Aktualizacja backendu po zmianach w kodzie

```bash
cd backend
git add .
git commit -m "Opis zmian"
git push origin master
```

Render zbuduje i wdroży nową wersję automatycznie (Auto-Deploy włączony domyślnie).

---

### Opcja B — monorepo (repo główne z folderem `backend/`)

Repozytorium: https://github.com/MateuszGurgul11/ogrodzenia-wielkopolska

W katalogu głównym jest `render.yaml` z `rootDir: backend`.

1. Render → **New +** → **Blueprint**
2. Połącz repo `ogrodzenia-wielkopolska`
3. Użyj tego samego `render.yaml` (root wskazuje na `backend/`)
4. Te same zmienne środowiskowe co w opcji A

---

### Render — deploy z CLI (opcjonalnie)

```bash
# Instalacja CLI (macOS)
brew install render

# Logowanie
render login

# Lista usług
render services list

# Ręczny redeploy (jeśli usługa już istnieje)
render deploys create <SERVICE_ID>
```

Większość zespołów wystarcza panel WWW + auto-deploy z GitHub.

---

## 2. Frontend na Vercel

Repozytorium: https://github.com/MateuszGurgul11/ogrodzenia-wielkopolska

### Krok 1: Import projektu (panel WWW)

1. Wejdź na https://vercel.com/dashboard
2. **Add New…** → **Project**
3. Importuj repo `ogrodzenia-wielkopolska`
4. Ustawienia buildu (Vercel wykrywa Next.js automatycznie):

| Ustawienie | Wartość |
|------------|---------|
| Framework Preset | Next.js |
| Root Directory | `.` (katalog główny) |
| Build Command | `npm run build` (domyślne) |
| Output Directory | `.next` (domyślne) |
| Install Command | `npm install` (domyślne) |

5. **Environment Variables** — dodaj przed pierwszym deployem:

| Zmienna | Skąd wziąć | Przykład |
|---------|------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → Web app | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | j.w. | `projekt.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | j.w. | `ogrodzenia-wielkopolska` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | j.w. | `projekt.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | j.w. | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | j.w. | `1:123:web:abc` |
| `NEXT_PUBLIC_API_URL` | URL z Rendera (krok backend) | `https://ogrodzenia-api.onrender.com` |

Zaznacz zmienne dla: **Production**, **Preview**, **Development**.

6. Kliknij **Deploy**

Po deployu adres produkcyjny:

```text
https://ogrodzenia-wielkopolska.vercel.app
```

(lub własna domena, jeśli podłączysz w Vercel → Domains)

### Krok 2: Deploy z CLI

```bash
# W katalogu głównym projektu (frontend)
cd /ścieżka/do/ogrodzenia-wielkopolska

# Instalacja Vercel CLI
npm i -g vercel

# Logowanie
vercel login

# Powiązanie z istniejącym projektem (pierwszy raz)
vercel link

# Podgląd lokalny z env produkcyjnymi (opcjonalnie)
vercel dev

# Deploy na preview (branch)
vercel

# Deploy na produkcję
vercel --prod
```

### Krok 3: Zmienne środowiskowe z CLI

```bash
# Dodanie pojedynczej zmiennej (production)
vercel env add NEXT_PUBLIC_API_URL production
# wklej: https://ogrodzenia-api.onrender.com

vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# wklej wartość z Firebase

# Lista zmiennych
vercel env ls

# Po zmianie env — obowiązkowy redeploy
vercel --prod
```

### Krok 4: Weryfikacja frontendu

```bash
# Strona główna
curl -sI https://ogrodzenia-wielkopolska.vercel.app | head -5

# Admin (powinien zwrócić 200)
curl -sI https://ogrodzenia-wielkopolska.vercel.app/admin/login | head -3
```

W przeglądarce:
- Konfigurator: https://ogrodzenia-wielkopolska.vercel.app
- Admin: https://ogrodzenia-wielkopolska.vercel.app/admin/login

Po pierwszym logowaniu w adminie użyj **Wgraj dane przykładowe** (wymaga działającego API na Renderze).

---

## 3. Kolejność wdrożenia (checklist)

Wykonuj w tej kolejności:

```text
[ ] 1. Firebase skonfigurowany (Auth + Firestore + service account)
[ ] 2. Backend wdrożony na Renderze
[ ] 3. curl /api/health → OK
[ ] 4. Frontend wdrożony na Vercel z NEXT_PUBLIC_API_URL = URL Rendera
[ ] 5. CORS_ORIGINS na Renderze zawiera URL Vercela
[ ] 6. Redeploy Vercel po ustawieniu API URL
[ ] 7. Logowanie admina + seed danych
```

---

## 4. Aktualizacja po zmianach w kodzie

### Zmieniłeś frontend (Next.js)

```bash
cd ogrodzenia-wielkopolska
git add .
git commit -m "Opis zmian"
git push origin main
```

Vercel zbuduje nową wersję automatycznie (jeśli repo jest podpięte).

Ręcznie:

```bash
vercel --prod
```

### Zmieniłeś backend (FastAPI)

```bash
cd backend
git add .
git commit -m "Opis zmian"
git push origin master
```

Render zbuduje nową wersję automatycznie.

### Zmieniłeś oba (monorepo)

```bash
# Repo główne (frontend + kod backendu jako pliki)
cd ogrodzenia-wielkopolska
git push origin main          # → Vercel

# Osobne repo backendu (dla Rendera)
cd backend
git push origin master        # → Render
```

---

## 5. Zmienne środowiskowe — podsumowanie

### Vercel (frontend)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=https://ogrodzenia-api.onrender.com
```

### Render (backend)

```env
FIREBASE_PROJECT_ID=ogrodzenia-wielkopolska
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
CORS_ORIGINS=https://ogrodzenia-wielkopolska.vercel.app
PORT=8000
```

Jeśli masz też domenę preview na Vercel, dodaj ją do `CORS_ORIGINS` po przecinku:

```env
CORS_ORIGINS=https://ogrodzenia-wielkopolska.vercel.app,https://twoj-preview.vercel.app
```

---

## 6. Rozwiązywanie problemów

### Konfigurator pokazuje dane demo zamiast katalogu z API

- Sprawdź `NEXT_PUBLIC_API_URL` na Vercel (musi wskazywać Render, nie `localhost`)
- Zrób redeploy Vercel po zmianie env: `vercel --prod`
- Sprawdź API: `curl https://TWOJ-API.onrender.com/api/catalog`

### Admin: błąd CORS w konsoli przeglądarki

- Na Renderze ustaw `CORS_ORIGINS` z dokładnym URL Vercela (bez `/` na końcu)
- Po zmianie — redeploy usługi na Renderze

### Render: build failed

- Sprawdź logi w Render Dashboard → usługa → **Logs**
- Upewnij się, że repo ma `Dockerfile` i `requirements.txt` w katalogu buildu (`backend/` lub root backend repo)

### Render free tier: pierwsze żądanie wolne (cold start)

- Plan darmowy usypia usługę po braku ruchu — pierwsze wejście może trwać 30–60 s
- Rozwiązanie: plan płatny lub cron ping co kilka minut (opcjonalnie)

### Vercel: build failed

```bash
# Sprawdź lokalnie przed pushem
npm run build
```

### Firebase: „Brak poświadczeń” na Renderze

- `FIREBASE_SERVICE_ACCOUNT_JSON` musi być poprawnym JSON w jednej linii
- Nie używaj `serviceAccountKey.json` w repo — tylko zmienna na Renderze

---

## 7. Przydatne linki

| Zasób | URL |
|-------|-----|
| Frontend (produkcja) | https://ogrodzenia-wielkopolska.vercel.app |
| Repo frontend | https://github.com/MateuszGurgul11/ogrodzenia-wielkopolska |
| Repo backend | https://github.com/MateuszGurgul11/ogrodzenia-wielkopolska-backend |
| Vercel Dashboard | https://vercel.com/dashboard |
| Render Dashboard | https://dashboard.render.com |
| Firebase Console | https://console.firebase.google.com |
| API docs (po deployu) | `https://TWOJ-API.onrender.com/docs` |
