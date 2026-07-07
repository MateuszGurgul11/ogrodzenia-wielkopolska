"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { AzurowoscDesigner } from "@/components/admin/fences/AzurowoscDesigner";
import { AzurowoscDrawer } from "@/components/admin/fences/AzurowoscDrawer";
import { FenceBlockForm } from "@/components/admin/fences/FenceBlockForm";
import {
  FenceColorMatrix,
  type FenceColorMatrixHandle,
} from "@/components/admin/fences/FenceColorMatrix";
import { FenceVersionManager } from "@/components/admin/fences/FenceVersionManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAllForAdmin,
  isApiConfigured,
  updateEntity,
} from "@/lib/api/client";
import {
  formatVariantValidationError,
  sanitizeVariantForApi,
} from "@/lib/fence/sanitizeVariant";
import { fenceVariantSchema } from "@/lib/validations";
import type {
  CatalogCollections,
  Color,
  FenceBlock,
  FenceBlockTexture,
  FenceVariant,
  Height,
  Post,
  PostTexture,
} from "@/lib/types";
import {
  applyStackVersionToVariant,
  buildFullStackLayout,
  getAzurGapOptions,
  getBlocksUsedInVariant,
  resolveAzurLayout,
} from "@/lib/fence/resolveStack";
import { getStackVersions, normalizeFenceVariant, patchStackVersion } from "@/lib/fence/stackVersions";
import { ensureSlotUids } from "@/lib/fence/slotUid";

export default function AdminFenceEditorPage() {
  const params = useParams<{ id: string }>();
  const variantId = params.id;
  const { user, getToken } = useAdminAuth();
  const [variant, setVariant] = useState<FenceVariant | null>(null);
  const [blocks, setBlocks] = useState<FenceBlock[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [heights, setHeights] = useState<Height[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [blockTextures, setBlockTextures] = useState<FenceBlockTexture[]>([]);
  const [postTextures, setPostTextures] = useState<PostTexture[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantDirty, setVariantDirty] = useState(false);
  const [pricesDirty, setPricesDirty] = useState(false);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [blockCreateRole, setBlockCreateRole] = useState<"standard" | "cap">(
    "standard",
  );
  const [azurDrawerOpen, setAzurDrawerOpen] = useState(false);
  const [azurVersionId, setAzurVersionId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [tab, setTab] = useState<"stack" | "params">("stack");
  const [previewHeightM, setPreviewHeightM] = useState(2);
  const priceMatrixRef = useRef<FenceColorMatrixHandle>(null);
  const canManage = isApiConfigured() && Boolean(user);

  const load = useCallback(async () => {
    if (!user || !isApiConfigured() || !variantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const [variants, blockList, postList, heightList, colorList, bt, pt] =
        await Promise.all([
          fetchAllForAdmin<FenceVariant>("fenceVariants", token),
          fetchAllForAdmin<FenceBlock>("fenceBlocks", token),
          fetchAllForAdmin<Post>("posts", token),
          fetchAllForAdmin<Height>("heights", token),
          fetchAllForAdmin<Color>("colors", token),
          fetchAllForAdmin<FenceBlockTexture>("fenceBlockTextures", token),
          fetchAllForAdmin<PostTexture>("postTextures", token),
        ]);
      const found = variants.find((v) => v.id === variantId) ?? null;
      if (found) {
        const normalized = normalizeFenceVariant({
          ...found,
          stack: ensureSlotUids(found.stack),
        });
        setVariant(normalized);
        const versions = getStackVersions(normalized);
        setActiveVersionId(versions[0]?.id ?? "");
      } else {
        setVariant(null);
      }
      setBlocks(blockList);
      setPosts(postList);
      setHeights(heightList);
      setColors(colorList.filter((c) => c.active));
      setBlockTextures(bt);
      setPostTextures(pt);
      setVariantDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [user, getToken, variantId]);

  useEffect(() => {
    load();
  }, [load]);

  const blockIds = useMemo(() => {
    if (!variant) return [];
    return getBlocksUsedInVariant(variant, blocks).map((b) => b.id);
  }, [variant, blocks]);

  const post = posts.find((p) => p.id === variant?.postId);

  const catalog: CatalogCollections = useMemo(
    () => ({
      posts,
      fenceBlocks: blocks,
      fenceVariants: variant ? [variant] : [],
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

  const stackVersions = useMemo(
    () => (variant ? getStackVersions(variant) : []),
    [variant],
  );

  const activeStackVersion = useMemo(() => {
    if (!stackVersions.length) return null;
    return (
      stackVersions.find((v) => v.id === activeVersionId) ?? stackVersions[0]
    );
  }, [stackVersions, activeVersionId]);

  const previewVariant = useMemo(() => {
    if (!variant || !activeStackVersion) return variant;
    return applyStackVersionToVariant(variant, activeStackVersion);
  }, [variant, activeStackVersion]);

  const azurowoscSummary = useMemo(() => {
    if (!activeStackVersion?.azurowoscEnabled) return null;
    const gaps = getAzurGapOptions(activeStackVersion);
    if (gaps.length === 0) return null;
    return gaps.map((g) => `${g} cm`).join(", ");
  }, [activeStackVersion]);

  const previewLayout = useMemo(() => {
    if (!activeStackVersion?.azurowoscEnabled || !previewVariant) return null;
    const gaps = getAzurGapOptions(activeStackVersion);
    if (gaps.length === 0) return null;
    return resolveAzurLayout({
      version: activeStackVersion,
      variant: previewVariant,
      blocks,
      heightM: previewHeightM,
      gapCm: gaps[0],
    });
  }, [activeStackVersion, previewVariant, blocks, previewHeightM]);

  const fullPreviewLayout = useMemo(() => {
    if (!activeStackVersion) return [];
    return buildFullStackLayout({
      stack: activeStackVersion.stack,
      blocks,
      heightM: previewHeightM,
    });
  }, [activeStackVersion, blocks, previewHeightM]);

  // Wysokość odniesienia dla pola „Wysokość słupka" — najwyższy dozwolony płot.
  const referenceHeightM = useMemo(() => {
    const allowed = heights.filter((h) => variant?.heightIds.includes(h.id));
    const list = allowed.length > 0 ? allowed : heights;
    const max = list.reduce((acc, h) => Math.max(acc, h.valueM), 0);
    return max > 0 ? max : 2;
  }, [heights, variant?.heightIds]);

  const [postHeightInput, setPostHeightInput] = useState("");

  useEffect(() => {
    const offset = variant?.postHeightOffsetCm;
    setPostHeightInput(
      offset == null
        ? ""
        : ((referenceHeightM * 100 + offset) / 100)
            .toString()
            .replace(".", ","),
    );
  }, [variant?.postHeightOffsetCm, referenceHeightM]);

  function handlePostHeightChange(raw: string) {
    setPostHeightInput(raw);
    if (raw.trim() === "") {
      markVariantDirty({ postHeightOffsetCm: null, postHeightCm: null });
      return;
    }
    const parsedM = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsedM) || parsedM <= 0) return;
    const offset = Math.round(parsedM * 100 - referenceHeightM * 100);
    if (offset < -150 || offset > 150) return;
    markVariantDirty({ postHeightOffsetCm: offset, postHeightCm: null });
  }

  const hasUnsavedChanges = variantDirty || pricesDirty;

  async function persistVariant(next: FenceVariant): Promise<boolean> {
    if (!canManage) return false;
    const withUids = normalizeFenceVariant({
      ...next,
      stack: ensureSlotUids(next.stack),
    });
    const forApi = sanitizeVariantForApi(withUids);
    const parsed = fenceVariantSchema.safeParse(forApi);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const raw = issue?.message ?? "Nieprawidłowe dane";
      setError(
        formatVariantValidationError(
          raw,
          issue?.path.filter(
            (p): p is string | number =>
              typeof p === "string" || typeof p === "number",
          ) ?? [],
        ),
      );
      return false;
    }
    setError(null);
    try {
      const token = await getToken();
      await updateEntity("fenceVariants", next.id, parsed.data, token);
      const refreshed = await fetchAllForAdmin<FenceVariant>("fenceVariants", token);
      const saved = refreshed.find((v) => v.id === next.id);
      setVariant(
        normalizeFenceVariant(saved ?? withUids),
      );
      setVariantDirty(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
      return false;
    }
  }

  async function saveVariant(next: FenceVariant): Promise<boolean> {
    setSaving(true);
    try {
      return await persistVariant(next);
    } finally {
      setSaving(false);
    }
  }

  function patchVariant(patch: Partial<FenceVariant>) {
    if (!variant) return;
    const next = normalizeFenceVariant({ ...variant, ...patch });
    if (patch.stack) {
      next.stack = ensureSlotUids(patch.stack);
    }
    setVariant(next);
    setVariantDirty(true);
  }

  function handleVariantChange(next: FenceVariant) {
    setVariant(normalizeFenceVariant(next));
    setVariantDirty(true);
  }

  function markVariantDirty(patch: Partial<FenceVariant>) {
    if (!variant) return;
    setVariant({ ...variant, ...patch });
    setVariantDirty(true);
  }

  async function handleSaveAll() {
    if (!variant || !canManage) return;
    setSaving(true);
    try {
      if (variantDirty) {
        const ok = await persistVariant(variant);
        if (!ok) return;
      }
      if (pricesDirty && priceMatrixRef.current) {
        await priceMatrixRef.current.save();
        setPricesDirty(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Nie znaleziono wariantu.</p>
        <Link href="/admin/fences">
          <Button variant="outline">← Wróć do listy</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/fences">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Ogrodzenia
          </Button>
        </Link>
        <div className="flex-1">
          <Input
            value={variant.name}
            onChange={(e) => markVariantDirty({ name: e.target.value })}
            className="font-heading max-w-md text-xl font-semibold"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={variant.active}
            onCheckedChange={(v) => patchVariant({ active: v })}
          />
          <Label>Aktywny</Label>
        </div>
      </div>

      {error && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {(
          [
            ["stack", "Układ paneli"],
            ["params", "Parametry"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "stack" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label>Podgląd wysokości</Label>
              <Select
                value={String(previewHeightM)}
                items={heights.map((h) => ({
                  value: String(h.valueM),
                  label: h.label,
                }))}
                onValueChange={(v) => setPreviewHeightM(Number(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {heights.map((h) => (
                    <SelectItem key={h.id} value={String(h.valueM)}>
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FenceVersionManager
              variant={variant}
              blocksCatalog={blocks}
              previewHeightM={previewHeightM}
              activeVersionId={activeVersionId}
              onActiveVersionChange={setActiveVersionId}
              onVariantChange={handleVariantChange}
              onAddBlock={(role) => {
                setBlockCreateRole(role);
                setBlockFormOpen(true);
              }}
              onOpenAzurowosc={(versionId) => {
                setAzurVersionId(versionId);
                setAzurDrawerOpen(true);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {previewLayout ? "Podgląd ażurowości" : "Podgląd pełny"}
            </Label>
            <AzurowoscDesigner
              key={`${variant.id}-${activeVersionId}-${previewHeightM}-${previewLayout ? "azur" : "full"}-${JSON.stringify(activeStackVersion?.stack)}-${JSON.stringify(activeStackVersion?.azurowoscOptions ?? [])}`}
              variant={previewVariant ?? variant}
              blocks={blocks}
              post={post}
              heightM={previewHeightM}
              colors={colors}
              catalog={catalog}
              initialLayout={previewLayout ?? fullPreviewLayout}
              initialColorId={variant.azurowoscColorId}
              sectionWidthPx={120}
              readOnly
            />
          </div>
        </div>
      )}

      {tab === "stack" && (
        <section className="space-y-3 border-t pt-6">
          <h2 className="font-heading text-lg font-semibold">Ceny per kolor</h2>
          <p className="text-muted-foreground text-sm">
            Ustaw cenę netto za płytę dla każdego panelu i koloru. Wygląd paneli
            jest proceduralny — tekstury nie są wymagane.
          </p>
          <FenceColorMatrix
            ref={priceMatrixRef}
            blockIds={blockIds}
            pricesOnly
            onDirtyChange={setPricesDirty}
          />
        </section>
      )}

      {tab === "params" && (
        <div className="grid max-w-xl gap-4">
          <div className="space-y-1.5">
            <Label>Słupek</Label>
            <Select
              value={variant.postId}
              items={posts.map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={(v) => v && patchVariant({ postId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {posts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Szerokość odcinka (cm)</Label>
            <Input
              type="number"
              value={variant.sectionWidthCm}
              onChange={(e) =>
                markVariantDirty({
                  sectionWidthCm: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Wysokość słupka przy płocie{" "}
              {referenceHeightM.toString().replace(".", ",")} m (m)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Auto (jak panele)"
              value={postHeightInput}
              onChange={(e) => handlePostHeightChange(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Puste = słupek równy z płotem. Wpisz np. 1,75 — przy płocie{" "}
              {referenceHeightM.toString().replace(".", ",")} m słupek będzie
              miał 1,75 m (panele z falą wystają ponad słupek). Przy innych
              wysokościach płotu różnica zostaje zachowana
              {variant.postHeightOffsetCm != null &&
                ` (obecnie ${variant.postHeightOffsetCm > 0 ? "+" : ""}${variant.postHeightOffsetCm} cm)`}
              .
            </p>
          </div>
          <div className="space-y-2">
            <Label>Dozwolone wysokości</Label>
            {heights.map((h) => {
              const checked = variant.heightIds.includes(h.id);
              return (
                <label key={h.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const heightIds = checked
                        ? variant.heightIds.filter((id) => id !== h.id)
                        : [...variant.heightIds, h.id];
                      patchVariant({ heightIds });
                    }}
                  />
                  {h.label}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <FenceBlockForm
        open={blockFormOpen}
        onOpenChange={setBlockFormOpen}
        initialRole={blockCreateRole}
        onSaved={() => load()}
      />

      <AzurowoscDrawer
        open={azurDrawerOpen}
        onOpenChange={setAzurDrawerOpen}
        variant={
          azurVersionId && variant
            ? applyStackVersionToVariant(
                variant,
                getStackVersions(variant).find((v) => v.id === azurVersionId) ??
                  getStackVersions(variant)[0],
              )
            : variant
        }
        blocks={blocks}
        posts={posts}
        heights={heights}
        previewHeightM={previewHeightM}
        onSave={async (patch) => {
          if (!variant || !azurVersionId) return;
          const next = normalizeFenceVariant(
            patchStackVersion(variant, azurVersionId, {
              azurowoscOptions: patch.azurowoscOptions,
              azurowoscColorId: patch.azurowoscColorId,
              azurowoscEnabled: true,
            }),
          );
          setVariant(next);
          const ok = await saveVariant(next);
          if (ok) await load();
        }}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {hasUnsavedChanges ? "Niezapisane zmiany" : "Wszystko zapisane"}
          </p>
          <Button
            onClick={() => void handleSaveAll()}
            disabled={!canManage || saving || !hasUnsavedChanges}
          >
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Zapisz zmiany
          </Button>
        </div>
      </div>
    </div>
  );
}
