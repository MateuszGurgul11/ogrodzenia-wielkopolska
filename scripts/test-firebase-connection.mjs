import { readFileSync, existsSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

function loadEnv() {
  const path = existsSync(".env.local") ? ".env.local" : ".env";
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const config = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId || !config.appId) {
  console.error("BŁĄD: Brakuje zmiennych Firebase w .env / .env.local");
  process.exit(1);
}

console.log("Projekt Firebase:", config.projectId);
console.log("Test połączenia z Firestore...\n");

const app = initializeApp(config);
const db = getFirestore(app);
const collections = ["posts", "panels", "spacerOptions", "heights", "colors"];

let ok = true;
for (const name of collections) {
  try {
    const snap = await getDocs(collection(db, name));
    console.log(`  ✓ ${name}: ${snap.size} dokumentów`);
  } catch (err) {
    ok = false;
    console.error(`  ✗ ${name}:`, err.message ?? err);
  }
}

if (ok) {
  console.log("\nPołączenie z Firestore działa poprawnie.");
} else {
  console.error("\nPołączenie nieudane — sprawdź reguły Firestore i konfigurację.");
  process.exit(1);
}
