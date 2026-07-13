"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Code2, Loader2, Plus, Undo2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { CustomSvgDesignDialog } from "@/components/admin/fences/CustomSvgDesignDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAllForAdmin,
  isApiConfigured,
  updateEntity,
} from "@/lib/api/client";
import { buildPanelBlockPreviewSvg } from "@/lib/fence/buildVariantPreview";
import { PANEL_PRESETS } from "@/lib/fence/patterns";
import type { FenceBlock } from "@/lib/types";

function presetLabel(block: FenceBlock): string {
  if (block.svgMarkup) return "Własny SVG";
  return PANEL_PRESETS.find((p) => p.key === block.patternKey)?.label ?? "Bez wzoru";
}

function PanelCard({
  block,
  canManage,
  onRename,
  onEditSvg,
}: {
  block: FenceBlock;
  canManage: boolean;
  onRename: (block: FenceBlock, name: string) => Promise<void>;
  onEditSvg: (block: FenceBlock) => void;
}) {
  const [name, setName] = useState(block.name);
  const [prevBlockName, setPrevBlockName] = useState(block.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (prevBlockName !== block.name) {
    setPrevBlockName(block.name);
    setName(block.name);
  }

  const svg = useMemo(
    () =>
      buildPanelBlockPreviewSvg({
        patternKey: block.patternKey,
        svgMarkup: block.svgMarkup,
        heightCm: block.heightCm,
        role: block.role,
      }),
    [block.patternKey, block.svgMarkup, block.heightCm, block.role],
  );

  const dirty = name.trim() !== block.name;
  const isCustom = Boolean(block.svgMarkup);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === block.name) return;
    setSaving(true);
    setError(null);
    try {
      await onRename(block, trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu nazwy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative bg-gradient-to-b from-[#eef1f4] to-[#e2e5e9] p-4">
        <div
          className="h-32 w-full [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {block.active ? (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              Aktywny
            </Badge>
          ) : (
            <Badge variant="secondary">Nieaktywny</Badge>
          )}
          {isCustom && (
            <Badge variant="outline" className="border-[#6366f1] bg-white/90 text-[#6366f1]">
              Własny SVG
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            disabled={!canManage || saving}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setName(block.name);
            }}
            aria-label="Nazwa panelu"
          />
          {isCustom && canManage && (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={() => onEditSvg(block)}
              title="Edytuj SVG"
            >
              <Code2 className="h-4 w-4" />
            </Button>
          )}
          {dirty && (
            <>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={saving || !name.trim()}
                onClick={save}
                title="Zapisz nazwę"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                disabled={saving}
                onClick={() => setName(block.name)}
                title="Cofnij zmianę"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}

        <dl className="grid gap-1.5 text-xs text-[#6b7280]">
          <div className="flex items-center justify-between gap-2">
            <dt>Wzór</dt>
            <dd className="font-medium text-[#303638]">{presetLabel(block)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>Wysokość płyty</dt>
            <dd className="font-medium text-[#303638]">{block.heightCm} cm</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function UnusedPresetCard({
  label,
  svg,
}: {
  label: string;
  svg: string;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-[#d1d5db] bg-white/60">
      <div className="bg-gradient-to-b from-[#eef1f4] to-[#e2e5e9] p-4">
        <div
          className="h-32 w-full opacity-90 [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="p-4">
        <p className="font-medium text-[#303638]">{label}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Wzór bez przypisanego panelu — dodaj panel w sekcji Ogrodzenia, aby go
          użyć i nazwać.
        </p>
      </div>
    </article>
  );
}

export function FencePanelGallery() {
  const { user, getToken } = useAdminAuth();
  const [blocks, setBlocks] = useState<FenceBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRole, setDialogRole] = useState<"standard" | "cap">("standard");
  const [editingBlock, setEditingBlock] = useState<FenceBlock | null>(null);
  const canManage = isApiConfigured() && Boolean(user);

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const list = await fetchAllForAdmin<FenceBlock>("fenceBlocks", token);
      setBlocks(list.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania paneli");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreateDialog(role: "standard" | "cap") {
    setEditingBlock(null);
    setDialogRole(role);
    setDialogOpen(true);
  }

  function openEditDialog(block: FenceBlock) {
    setEditingBlock(block);
    setDialogRole(block.role);
    setDialogOpen(true);
  }

  const handleRename = useCallback(
    async (block: FenceBlock, name: string) => {
      const token = await getToken();
      await updateEntity(
        "fenceBlocks",
        block.id,
        {
          name,
          heightCm: block.heightCm,
          role: block.role,
          patternKey: block.patternKey,
          svgMarkup: block.svgMarkup,
          supportsAzurowosc: block.supportsAzurowosc,
          description: block.description,
          baseTextureUrl: block.baseTextureUrl,
          sortOrder: block.sortOrder,
          active: block.active,
        },
        token,
      );
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, name } : b)),
      );
    },
    [getToken],
  );

  const mainPanels = useMemo(
    () => blocks.filter((b) => b.role === "standard"),
    [blocks],
  );
  const capPanels = useMemo(
    () => blocks.filter((b) => b.role === "cap"),
    [blocks],
  );

  const unusedPresets = useMemo(() => {
    const used = new Set(
      blocks
        .filter((b) => !b.svgMarkup && b.patternKey)
        .map((b) => b.patternKey),
    );
    return PANEL_PRESETS.filter((p) => !used.has(p.key)).map((preset) => ({
      key: preset.key,
      label: preset.label,
      svg: buildPanelBlockPreviewSvg({
        patternKey: preset.key,
        heightCm: preset.role === "cap" ? 25 : 50,
        role: preset.role,
      }),
    }));
  }, [blocks]);

  const nextSortOrder = blocks.length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <p className="text-muted-foreground rounded-md border px-4 py-6 text-center text-sm">
        Zaloguj się w panelu admina, aby zobaczyć galerię paneli.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {error && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Panele główne</h2>
            <p className="text-muted-foreground text-sm">
              Powtarzalne płyty wypełniające wysokość ogrodzenia. Kliknij nazwę,
              aby ją zmienić.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openCreateDialog("standard")}>
            <Plus className="mr-1 h-4 w-4" />
            Własny design SVG
          </Button>
        </div>
        {mainPanels.length === 0 ? (
          <p className="text-muted-foreground text-sm">Brak paneli głównych.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {mainPanels.map((block) => (
              <PanelCard
                key={block.id}
                block={block}
                canManage={canManage}
                onRename={handleRename}
                onEditSvg={openEditDialog}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Panele górne</h2>
            <p className="text-muted-foreground text-sm">
              Płyty zamykające stos — montowane raz, na górze przęsła.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openCreateDialog("cap")}>
            <Plus className="mr-1 h-4 w-4" />
            Własny design SVG
          </Button>
        </div>
        {capPanels.length === 0 ? (
          <p className="text-muted-foreground text-sm">Brak paneli górnych.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {capPanels.map((block) => (
              <PanelCard
                key={block.id}
                block={block}
                canManage={canManage}
                onRename={handleRename}
                onEditSvg={openEditDialog}
              />
            ))}
          </div>
        )}
      </section>

      {unusedPresets.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Pozostałe wygenerowane wzory
            </h2>
            <p className="text-muted-foreground text-sm">
              Wzory proceduralne, których nie używa jeszcze żaden panel.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {unusedPresets.map((preset) => (
              <UnusedPresetCard
                key={preset.key}
                label={preset.label}
                svg={preset.svg}
              />
            ))}
          </div>
        </section>
      )}

      <CustomSvgDesignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialRole={dialogRole}
        sortOrder={nextSortOrder}
        editingBlock={editingBlock}
        onSaved={load}
      />
    </div>
  );
}
