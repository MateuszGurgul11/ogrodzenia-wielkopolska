export const PRESET_BACKGROUNDS = [
  {
    id: "default-facade",
    label: "Domyślna fasada",
    url: "/preview/default-facade.png",
  },
] as const;

export type BackgroundPresetId = (typeof PRESET_BACKGROUNDS)[number]["id"];

export const DEFAULT_BACKGROUND_PRESET_ID: BackgroundPresetId = "default-facade";

export const MAX_BG_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_BG_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateBackgroundFile(file: File): string | null {
  if (!ACCEPTED_BG_TYPES.includes(file.type)) {
    return "Dozwolone formaty: JPG, PNG, WebP.";
  }
  if (file.size > MAX_BG_SIZE) {
    return "Plik jest za duży. Maksymalny rozmiar to 5 MB.";
  }
  return null;
}

export function resolveBackgroundUrl(
  presetId: string,
  userUrl: string | null,
): string {
  if (userUrl) return userUrl;
  const preset = PRESET_BACKGROUNDS.find((p) => p.id === presetId);
  return preset?.url ?? PRESET_BACKGROUNDS[0].url;
}
