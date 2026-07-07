import { FirebaseError } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from "firebase/storage";
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseStorageBucket,
  isStorageConfigured,
} from "@/lib/firebase/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 60_000;

export function catalogAssetPath(...segments: string[]): string {
  return `catalog/${segments.filter(Boolean).join("/")}`;
}

export function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "jpg" || fromName === "jpeg") return "jpg";
  if (fromName === "png") return "png";
  if (fromName === "webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function validateCatalogAssetFile(file: File): string | null {
  const type = file.type || guessMimeFromName(file.name);
  if (!ACCEPTED_TYPES.includes(type)) {
    return "Dozwolone formaty: JPEG, PNG, WebP.";
  }
  if (file.size > MAX_BYTES) {
    return "Plik jest za duży (max 8 MB).";
  }
  return null;
}

function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function getStorageErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "storage/unauthorized":
        return "Brak uprawnień do Storage. Wdróż reguły z pliku storage.rules (firebase deploy --only storage) i zaloguj się ponownie.";
      case "storage/unauthenticated":
        return "Sesja wygasła — wyloguj się i zaloguj ponownie w panelu admina.";
      case "storage/canceled":
        return "Upload został anulowany.";
      case "storage/quota-exceeded":
        return "Przekroczono limit przestrzeni Firebase Storage.";
      case "storage/retry-limit-exceeded":
        return "Upload nie powiódł się po wielu próbach. Sprawdź połączenie z internetem.";
      case "storage/invalid-argument":
        return "Nieprawidłowa ścieżka lub plik. Sprawdź konfigurację NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.";
      case "storage/object-not-found":
        return "Plik nie został znaleziony w Storage.";
      default:
        return `Błąd Firebase Storage (${error.code}): ${error.message}`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Nieznany błąd podczas uploadu.";
}

async function ensureStorageAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (!auth.currentUser) {
    throw new Error(
      "Musisz być zalogowany w panelu admina, aby wgrywać zdjęcia.",
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function uploadCatalogAsset(
  file: File,
  pathWithoutExt: string,
): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Firebase Storage nie jest skonfigurowany. Ustaw NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET w .env i zrestartuj serwer dev.",
    );
  }

  if (!pathWithoutExt.trim()) {
    throw new Error("Brak ścieżki docelowej dla pliku.");
  }

  const error = validateCatalogAssetFile(file);
  if (error) throw new Error(error);

  await ensureStorageAuth();

  const ext = extensionForFile(file);
  const fullPath = `${pathWithoutExt}.${ext}`;
  const bucket = getFirebaseStorageBucket();
  const app = getFirebaseApp();
  const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
  const storageRef = ref(storage, fullPath);
  const contentType = file.type || guessMimeFromName(file.name);
  const metadata: UploadMetadata = { contentType };

  const uploadPromise = new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);
    task.on(
      "state_changed",
      undefined,
      (uploadError) => reject(uploadError),
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
      },
    );
  });

  try {
    return await withTimeout(
      uploadPromise,
      UPLOAD_TIMEOUT_MS,
      "Upload trwa zbyt długo. Sprawdź połączenie, reguły Storage (firebase deploy --only storage) oraz czy Storage jest włączony w Firebase Console.",
    );
  } catch (err) {
    throw new Error(getStorageErrorMessage(err));
  }
}
