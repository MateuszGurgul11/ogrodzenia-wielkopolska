"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadCatalogAsset } from "@/lib/firebase/storage";
import { isStorageConfigured } from "@/lib/firebase/client";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";

type Props = {
  label?: string;
  value?: string;
  storagePath: string;
  onChange: (url: string) => void | Promise<void>;
  onClear?: () => void;
  disabled?: boolean;
};

export function AssetUploader({
  label,
  value,
  storagePath,
  onChange,
  onClear,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAdminAuth();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isStorageConfigured()) {
      setError(
        "Firebase Storage nie jest skonfigurowany (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).",
      );
      return;
    }

    if (!user) {
      setError("Musisz być zalogowany, aby wgrywać zdjęcia.");
      return;
    }

    if (!storagePath.trim()) {
      setError("Brak ścieżki uploadu — zapisz wpis i spróbuj ponownie.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await uploadCatalogAsset(file, storagePath);
      await Promise.resolve(onChange(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd uploadu");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-[#303638]">{label}</p>
      )}
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
            <Image
              src={value}
              alt=""
              fill
              className="pointer-events-none object-cover"
              unoptimized
            />
            {onClear && (
              <button
                type="button"
                className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                disabled={disabled || uploading}
                aria-label="Usuń zdjęcie"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] text-[#9ca3af]">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {value ? "Zmień zdjęcie" : "Wgraj zdjęcie"}
          </Button>
          {value && onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={disabled || uploading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
            >
              Usuń zdjęcie
            </Button>
          )}
          <p className="max-w-xs text-[11px] text-[#9ca3af]">
            JPEG, PNG lub WebP · max 8 MB
          </p>
        </div>
      </div>
      {error && (
        <p className="text-destructive max-w-md text-xs leading-relaxed">{error}</p>
      )}
    </div>
  );
}
