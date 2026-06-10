/**
 * Test konfiguracji Firebase Auth (bez logowania hasłem).
 * Uruchom: node scripts/test-firebase-auth.mjs
 */
import { readFileSync, existsSync } from "fs";

function loadEnv() {
  const path = existsSync(".env.local") ? ".env.local" : ".env";
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

if (!apiKey || !projectId || !authDomain) {
  console.error("BŁĄD: Brakuje zmiennych Firebase Auth w .env");
  process.exit(1);
}

console.log("Projekt:", projectId);
console.log("Auth domain:", authDomain);
console.log("\nSprawdzam konfigurację Auth API...\n");

const url =
  `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    identifier: "test@example.com",
    continueUri: `http://localhost:3000/admin/login`,
  }),
});

const data = await res.json();

if (res.ok) {
  console.log("✓ Firebase Authentication API jest dostępne");
  console.log("\nNastępne kroki:");
  console.log("  1. Firebase Console → Authentication → Sign-in method → Email/Password (włączone)");
  console.log("  2. Authentication → Users → Add user (konto admina)");
  console.log("  3. Zaloguj się na /admin/login");
} else {
  console.error("✗ Błąd Auth API:", data.error?.message ?? JSON.stringify(data));
  if (data.error?.message?.includes("API key not valid")) {
    console.error("  Sprawdź NEXT_PUBLIC_FIREBASE_API_KEY w .env");
  }
  process.exit(1);
}
