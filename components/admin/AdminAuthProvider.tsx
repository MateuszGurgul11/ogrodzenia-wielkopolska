"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { getIdToken, logoutAdmin, subscribeToAuth } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  logout: async () => {},
  getToken: async () => {
    throw new Error("Brak autoryzacji");
  },
});

export function useAdminAuth() {
  return useContext(AuthContext);
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsub;
  }, [configured]);

  useEffect(() => {
    if (loading) return;

    if (!configured) {
      if (!isLoginPage) router.replace("/admin/login");
      return;
    }

    if (!user && !isLoginPage) {
      router.replace("/admin/login");
      return;
    }

    if (user && isLoginPage) {
      router.replace("/admin");
    }
  }, [user, loading, configured, isLoginPage, router]);

  const logout = useCallback(async () => {
    if (!configured) return;
    await logoutAdmin();
    router.replace("/admin/login");
  }, [configured, router]);

  const getToken = useCallback(async () => {
    const token = await getIdToken(true);
    if (!token) throw new Error("Brak tokena — zaloguj się ponownie.");
    return token;
  }, []);

  const showLoader = configured && loading && !isLoginPage;
  const blockUnauthenticated = configured && !loading && !user && !isLoginPage;

  if (showLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (blockUnauthenticated) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, configured, logout, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
