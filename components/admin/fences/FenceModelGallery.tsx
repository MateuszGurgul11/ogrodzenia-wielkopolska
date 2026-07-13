"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAllForAdmin, isApiConfigured } from "@/lib/api/client";
import { buildFenceGalleryItems } from "@/lib/fence/buildVariantPreview";
import { getStackVersions } from "@/lib/fence/stackVersions";
import type {
  AzurowoscPreset,
  CatalogCollections,
  Color,
  FenceBlock,
  FenceBlockTexture,
  FenceVariant,
  Height,
  OpeningElement,
  Panel,
  PanelTexture,
  Post,
  PostTexture,
  SpacerOption,
} from "@/lib/types";

function GalleryCard({
  item,
}: {
  item: ReturnType<typeof buildFenceGalleryItems>[number];
}) {
  const versionCountLabel =
    item.versionName !== "Wersja A" ? item.versionName : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-gradient-to-b from-[#eef1f4] to-[#e2e5e9] p-4">
        <div
          className="h-full w-full [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: item.svg }}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {item.active ? (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              Aktywny
            </Badge>
          ) : (
            <Badge variant="secondary">Nieaktywny</Badge>
          )}
          {item.azurowoscEnabled && (
            <Badge variant="outline" className="border-[#ff3131] bg-white/90 text-[#ff3131]">
              Ażurowość
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-[#303638]">
            {item.variantName}
          </h2>
          {versionCountLabel && (
            <p className="text-muted-foreground mt-0.5 text-sm">{item.versionName}</p>
          )}
        </div>

        <dl className="grid gap-1.5 text-xs text-[#6b7280]">
          <div className="flex items-center justify-between gap-2">
            <dt>Wysokość</dt>
            <dd className="font-medium text-[#303638]">{item.heightLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Kolor</dt>
            <dd className="flex items-center gap-2 font-medium text-[#303638]">
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: item.colorHex }}
              />
              {item.colorLabel}
            </dd>
          </div>
        </dl>

        <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
          {item.blockSummary}
        </p>

        <Link
          href={`/admin/fences/${item.variantId}`}
          className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ff3131] hover:underline"
        >
          Edytuj wariant
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function FenceModelGallery() {
  const { user, getToken } = useAdminAuth();
  const [catalog, setCatalog] = useState<CatalogCollections | null>(null);
  const [variants, setVariants] = useState<FenceVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heightId, setHeightId] = useState<string>("auto");
  const [colorId, setColorId] = useState<string>("auto");
  const [showInactive, setShowInactive] = useState(true);

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [
        fenceVariants,
        fenceBlocks,
        posts,
        heights,
        colors,
        fenceBlockTextures,
        postTextures,
        azurowoscPresets,
        spacerOptions,
        panels,
        panelTextures,
        elements,
      ] = await Promise.all([
        fetchAllForAdmin<FenceVariant>("fenceVariants", token),
        fetchAllForAdmin<FenceBlock>("fenceBlocks", token),
        fetchAllForAdmin<Post>("posts", token),
        fetchAllForAdmin<Height>("heights", token),
        fetchAllForAdmin<Color>("colors", token),
        fetchAllForAdmin<FenceBlockTexture>("fenceBlockTextures", token),
        fetchAllForAdmin<PostTexture>("postTextures", token),
        fetchAllForAdmin<AzurowoscPreset>("azurowoscPresets", token),
        fetchAllForAdmin<SpacerOption>("spacerOptions", token),
        fetchAllForAdmin<Panel>("panels", token),
        fetchAllForAdmin<PanelTexture>("panelTextures", token),
        fetchAllForAdmin<OpeningElement>("elements", token),
      ]);

      setCatalog({
        fenceVariants,
        fenceBlocks,
        posts,
        heights,
        colors,
        fenceBlockTextures,
        postTextures,
        azurowoscPresets,
        spacerOptions,
        panels,
        panelTextures,
        elements,
      });
      setVariants(fenceVariants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania katalogu");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredVariants = useMemo(
    () => (showInactive ? variants : variants.filter((v) => v.active)),
    [showInactive, variants],
  );

  const galleryItems = useMemo(() => {
    if (!catalog) return [];
    return buildFenceGalleryItems(catalog, filteredVariants, {
      heightId: heightId === "auto" ? null : heightId,
      colorId: colorId === "auto" ? null : colorId,
    });
  }, [catalog, filteredVariants, heightId, colorId]);

  const stats = useMemo(() => {
    const versionCount = filteredVariants.reduce(
      (sum, variant) => sum + getStackVersions(variant).length,
      0,
    );
    return {
      variants: filteredVariants.length,
      previews: galleryItems.length,
      versions: versionCount,
    };
  }, [filteredVariants, galleryItems.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <p className="text-muted-foreground rounded-md border px-4 py-6 text-center text-sm">
        Zaloguj się w panelu admina, aby zobaczyć galerię modeli.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
        <div className="min-w-[180px] flex-1">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9ca3af]">
            Wysokość podglądu
          </p>
          <Select
            value={heightId}
            onValueChange={(value) => setHeightId(value ?? "auto")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Domyślna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Domyślna (z wariantu / 2 m)</SelectItem>
              {catalog.heights
                .filter((h) => h.active)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((height) => (
                  <SelectItem key={height.id} value={height.id}>
                    {height.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9ca3af]">
            Kolor podglądu
          </p>
          <Select
            value={colorId}
            onValueChange={(value) => setColorId(value ?? "auto")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Domyślny" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Domyślny (pierwszy aktywny)</SelectItem>
              {catalog.colors
                .filter((c) => c.active)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((color) => (
                  <SelectItem key={color.id} value={color.id}>
                    {color.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#303638]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-[#ff3131]"
          />
          Pokaż nieaktywne
        </label>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-[#6b7280]">
        <span>
          <strong className="text-[#303638]">{stats.variants}</strong> wariantów
        </span>
        <span>·</span>
        <span>
          <strong className="text-[#303638]">{stats.versions}</strong> wersji układu
        </span>
        <span>·</span>
        <span>
          <strong className="text-[#303638]">{stats.previews}</strong> podglądów SVG
        </span>
      </div>

      {galleryItems.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="font-medium text-[#303638]">Brak modeli do wyświetlenia</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Dodaj warianty ogrodzeń i panele w sekcji Ogrodzenia, aby zobaczyć podglądy.
          </p>
          <Link
            href="/admin/fences"
            className="mt-4 inline-block text-sm font-semibold text-[#ff3131] hover:underline"
          >
            Przejdź do zarządzania ogrodzeniami
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {galleryItems.map((item) => (
            <GalleryCard
              key={`${item.variantId}-${item.versionId}`}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}
