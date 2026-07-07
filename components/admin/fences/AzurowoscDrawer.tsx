"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, X } from "lucide-react";
import {
  AzurowoscDesigner,
  validateAzurowoscLayout,
} from "@/components/admin/fences/AzurowoscDesigner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchAllForAdmin, isApiConfigured } from "@/lib/api/client";
import { buildAzurAutoLayout } from "@/lib/fence/resolveStack";
import type {
  CatalogCollections,
  Color,
  FenceAzurOption,
  FenceAzurUnit,
  FenceBlock,
  FenceBlockTexture,
  FenceVariant,
  Height,
  Post,
  PostTexture,
} from "@/lib/types";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: FenceVariant;
  blocks: FenceBlock[];
  posts: Post[];
  heights: Height[];
  previewHeightM: number;
  onSave: (patch: {
    azurowoscOptions: FenceAzurOption[];
    azurowoscColorId: string | null;
    azurowoscEnabled: boolean;
    azurowoscLayout: null;
  }) => Promise<void>;
};

export function AzurowoscDrawer({
  open,
  onOpenChange,
  variant,
  blocks,
  posts,
  heights,
  previewHeightM,
  onSave,
}: Props) {
  const { user, getToken } = useAdminAuth();
  const [colors, setColors] = useState<Color[]>([]);
  const [blockTextures, setBlockTextures] = useState<FenceBlockTexture[]>([]);
  const [postTextures, setPostTextures] = useState<PostTexture[]>([]);
  const [options, setOptions] = useState<FenceAzurOption[]>([]);
  const [activeGap, setActiveGap] = useState<number | null>(null);
  const [activeHeightM, setActiveHeightM] = useState(previewHeightM);
  const [colorId, setColorId] = useState<string | null>(null);
  const [newGap, setNewGap] = useState("");
  const [resetNonce, setResetNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = posts.find((p) => p.id === variant.postId);

  const variantHeights = useMemo(() => {
    const allowed = heights.filter((h) => variant.heightIds.includes(h.id));
    return allowed.length > 0 ? allowed : heights;
  }, [heights, variant.heightIds]);

  const catalog: CatalogCollections = useMemo(
    () => ({
      posts,
      fenceBlocks: blocks,
      fenceVariants: [variant],
      fenceBlockTextures: blockTextures,
      azurowoscPresets: [],
      spacerOptions: [],
      heights,
      colors,
      elements: [],
      postTextures,
      panels: [],
      panelTextures: [],
    }),
    [posts, blocks, variant, blockTextures, heights, colors, postTextures],
  );

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const [c, bt, pt] = await Promise.all([
        fetchAllForAdmin<Color>("colors", token),
        fetchAllForAdmin<FenceBlockTexture>("fenceBlockTextures", token),
        fetchAllForAdmin<PostTexture>("postTextures", token),
      ]);
      setColors(c.filter((col) => col.active));
      setBlockTextures(bt);
      setPostTextures(pt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const initial = (variant.azurowoscOptions ?? []).map((o) => ({
      gapCm: o.gapCm,
      layouts: o.layouts?.map((l) => ({ ...l, units: [...l.units] })) ?? [],
    }));
    setOptions(initial);
    setActiveGap(initial[0]?.gapCm ?? null);
    setActiveHeightM(previewHeightM);
    setColorId(variant.azurowoscColorId ?? null);
    setNewGap("");
    void load();
  }, [open, variant, previewHeightM, load]);

  const activeOption = options.find((o) => o.gapCm === activeGap) ?? null;

  const currentLayout = useMemo<FenceAzurUnit[] | null>(() => {
    if (!activeOption) return null;
    const saved = activeOption.layouts.find(
      (l) => Math.abs(l.heightM - activeHeightM) < 0.01,
    );
    if (saved?.units.length) return saved.units;
    return buildAzurAutoLayout({
      stack: variant.stack,
      blocks,
      heightM: activeHeightM,
      gapCm: activeOption.gapCm,
    });
  }, [activeOption, activeHeightM, variant, blocks]);

  function storeLayout(units: FenceAzurUnit[]) {
    if (activeGap == null) return;
    setOptions((prev) =>
      prev.map((o) => {
        if (o.gapCm !== activeGap) return o;
        const rest = o.layouts.filter(
          (l) => Math.abs(l.heightM - activeHeightM) >= 0.01,
        );
        return {
          ...o,
          layouts: [...rest, { heightM: activeHeightM, units }],
        };
      }),
    );
  }

  function addGapOption() {
    const gap = Math.round(Number(newGap.replace(",", ".")));
    if (!Number.isFinite(gap) || gap < 1 || gap > 100) {
      setError("Podaj przerwę w zakresie 1–100 cm");
      return;
    }
    setError(null);
    if (options.some((o) => o.gapCm === gap)) {
      setActiveGap(gap);
      setNewGap("");
      return;
    }
    setOptions((prev) =>
      [...prev, { gapCm: gap, layouts: [] }].sort((a, b) => a.gapCm - b.gapCm),
    );
    setActiveGap(gap);
    setNewGap("");
  }

  function removeGapOption(gap: number) {
    const next = options.filter((o) => o.gapCm !== gap);
    setOptions(next);
    if (activeGap === gap) setActiveGap(next[0]?.gapCm ?? null);
  }

  function regenerateCurrent() {
    if (activeGap == null) return;
    setOptions((prev) =>
      prev.map((o) =>
        o.gapCm === activeGap
          ? {
              ...o,
              layouts: o.layouts.filter(
                (l) => Math.abs(l.heightM - activeHeightM) >= 0.01,
              ),
            }
          : o,
      ),
    );
    setResetNonce((n) => n + 1);
  }

  async function persist(nextOptions: FenceAzurOption[]) {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        azurowoscOptions: nextOptions,
        azurowoscColorId: colorId,
        azurowoscEnabled: true,
        azurowoscLayout: null,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    for (const option of options) {
      for (const layout of option.layouts) {
        const validation = validateAzurowoscLayout(layout.units, layout.heightM);
        if (!validation.valid) {
          setError(
            `Ażur ${option.gapCm} cm, wysokość ${layout.heightM} m: ${validation.message}`,
          );
          return;
        }
      }
    }
    await persist(options);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Ustaw ażurowość</SheetTitle>
          <SheetDescription>
            Dodaj dostępne przerwy (cm) dla tego wariantu. Dla każdej przerwy i
            wysokości układ generuje się automatycznie — możesz go dowolnie
            przestawić: usuń panel, przeciągnij go w inne miejsce lub wstaw z
            powrotem w przerwę.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {error && (
            <p className="text-destructive mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <div className="mb-5 space-y-2">
            <Label>Dostępne ażurowości</Label>
            <div className="flex flex-wrap items-center gap-2">
              {options.map((o) => (
                <span
                  key={o.gapCm}
                  className={`inline-flex items-center overflow-hidden rounded-full border text-sm transition-colors ${
                    activeGap === o.gapCm
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-white hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    className="py-1.5 pl-3 pr-1 font-medium"
                    onClick={() => setActiveGap(o.gapCm)}
                  >
                    {o.gapCm} cm
                  </button>
                  <button
                    type="button"
                    className="py-1.5 pr-2 pl-1 opacity-60 hover:opacity-100"
                    title="Usuń tę ażurowość"
                    onClick={() => removeGapOption(o.gapCm)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="np. 10"
                  value={newGap}
                  onChange={(e) => setNewGap(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGapOption()}
                  className="h-8 w-24"
                />
                <Button type="button" variant="outline" size="sm" onClick={addGapOption}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Dodaj
                </Button>
              </div>
            </div>
            {options.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Brak ażurowości — wariant będzie dostępny tylko jako szczelny.
              </p>
            )}
          </div>

          {activeOption && (
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Wysokość płotu</Label>
                <Select
                  value={String(activeHeightM)}
                  items={variantHeights.map((h) => ({
                    value: String(h.valueM),
                    label: h.label,
                  }))}
                  onValueChange={(v) => v && setActiveHeightM(Number(v))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {variantHeights.map((h) => (
                      <SelectItem key={h.id} value={String(h.valueM)}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={regenerateCurrent}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Wygeneruj od nowa
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : activeOption && currentLayout ? (
            <AzurowoscDesigner
              key={`${activeOption.gapCm}-${activeHeightM}-${resetNonce}`}
              variant={variant}
              blocks={blocks}
              post={post}
              heightM={activeHeightM}
              colors={colors}
              catalog={catalog}
              initialLayout={currentLayout}
              initialColorId={colorId}
              sectionWidthPx={240}
              onChange={(nextLayout, nextColorId) => {
                storeLayout(nextLayout);
                setColorId(nextColorId);
              }}
            />
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
              Dodaj ażurowość (cm), aby zaprojektować układ paneli.
            </p>
          )}
        </SheetBody>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => void persist([])}
            disabled={saving}
          >
            Usuń ażurowość
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Zapisz
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
