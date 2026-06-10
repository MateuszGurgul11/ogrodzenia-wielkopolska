import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth, isFirebaseConfigured, isBrowser } from "./client";

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Nieprawidłowy adres e-mail.";
      case "auth/user-disabled":
        return "Konto zostało wyłączone.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Nieprawidłowy e-mail lub hasło.";
      case "auth/too-many-requests":
        return "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.";
      case "auth/network-request-failed":
        return "Błąd sieci. Sprawdź połączenie z internetem.";
      case "auth/operation-not-allowed":
        return "Logowanie e-mail/hasło nie jest włączone w Firebase Console (Authentication → Sign-in method).";
      default:
        return `Błąd logowania (${error.code}).`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Wystąpił nieoczekiwany błąd podczas logowania.";
}

export async function loginAdmin(email: string, password: string) {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logoutAdmin() {
  const auth = getFirebaseAuth();
  return signOut(auth);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!isBrowser() || !isFirebaseConfigured()) return null;
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  if (!isBrowser() || !isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }

  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}
