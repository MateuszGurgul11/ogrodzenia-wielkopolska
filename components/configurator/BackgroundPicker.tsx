"use client";

import { useRef } from "react";
import Image from "next/image";
import { Check, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRESET_BACKGROUNDS,
  validateBackgroundFile,
} from "@/lib/configurator/backgrounds";
import { useConfiguratorStore } from "@/lib/configurator/state";

export function BackgroundPicker() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundImageUrl = useConfiguratorStore((s) => s.backgroundImageUrl);
  const backgroundPresetId = useConfiguratorStore((s) => s.backgroundPresetId);
  const setBackgroundImage = useConfiguratorStore((s) => s.setBackgroundImage);
  const setBackgroundPreset = useConfiguratorStore((s) => s.setBackgroundPreset);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = validateBackgroundFile(file);
    if (error) {
      alert(error);
      return;
    }

    setBackgroundImage(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-2 gap-2.5">
        {PRESET_BACKGROUNDS.map((preset) => {
          const selected = !backgroundImageUrl && backgroundPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setBackgroundPreset(preset.id)}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all",
                selected
                  ? "border-[#ff3131] ring-2 ring-[#ff3131]/35 ring-offset-2 ring-offset-[#1a1a1a]"
                  : "border-[#333] hover:border-[#555]",
              )}
            >
              <Image
                src={preset.url}
                alt={preset.label}
                fill
                sizes="180px"
                className="object-cover"
                unoptimized
              />
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff3131] shadow-md">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}

        {backgroundImageUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-[#ff3131] ring-2 ring-[#ff3131]/35 ring-offset-2 ring-offset-[#1a1a1a]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backgroundImageUrl}
              alt="Twoje zdjęcie"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
              Twoje zdjęcie
            </span>
            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff3131] shadow-md">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#555] bg-white px-4 py-3.5 text-sm font-semibold text-[#303638] transition-colors hover:bg-[#f5f5f5]"
      >
        <ImagePlus className="h-4 w-4 text-[#ff3131]" />
        Prześlij zdjęcie własnego domu
      </button>

      <p className="text-[10px] leading-relaxed text-[#666]">
        JPG, PNG lub WebP do 5 MB. Zdjęcie działki lub posesji pomoże lepiej
        ocenić wygląd ogrodzenia.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
