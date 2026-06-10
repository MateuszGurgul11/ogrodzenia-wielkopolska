"use client";

import { useEffect, useState } from "react";

/** true dopiero po hydratacji — unika mismatch SSR vs klient */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
