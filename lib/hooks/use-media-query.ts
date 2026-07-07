"use client";

import { useEffect, useState } from "react";

function getMatches(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMatches(query));

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Tailwind `lg` breakpoint — min-width 1024px */
export function useIsLgUp(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** Mobile/tablet w orientacji poziomej (< lg) */
export function useIsMobileLandscape(): boolean {
  return useMediaQuery("(max-width: 1023px) and (orientation: landscape)");
}

/** Mobile/tablet w orientacji pionowej (< lg) */
export function useIsMobilePortrait(): boolean {
  return useMediaQuery("(max-width: 1023px) and (orientation: portrait)");
}
