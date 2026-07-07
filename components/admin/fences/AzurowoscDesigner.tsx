"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CatalogCollections,
  Color,
  FenceAzurUnit,
  FenceBlock,
  FenceVariant,
  Post,
} from "@/lib/types";
import {
  buildFullStackLayout,
  countPanelsInLayout,
  resolveBlockTextureUrl,
  resolvePostHeightCm,
} from "@/lib/fence/resolveStack";
import { resolvePostTextureUrl } from "@/lib/fence/resolveTexture";
import { createSlotUid } from "@/lib/fence/slotUid";

type DesignerUnit = FenceAzurUnit & { uid: string };

type Props = {
  variant: FenceVariant;
  blocks: FenceBlock[];
  post: Post | undefined;
  heightM: number;
  colors: Color[];
  catalog: CatalogCollections;
  /** Układ startowy (od góry do dołu). */
  initialLayout: FenceAzurUnit[];
  initialColorId?: string | null;
  readOnly?: boolean;
  /** Szerokość rysowanej sekcji w px. */
  sectionWidthPx?: number;
  onChange?: (layout: FenceAzurUnit[], colorId: string | null) => void;
};

function toDesignerUnits(layout: FenceAzurUnit[]): DesignerUnit[] {
  return layout.map((u) => ({ ...u, uid: createSlotUid() }));
}

function fromDesignerUnits(units: DesignerUnit[]): FenceAzurUnit[] {
  return units.map(({ blockId, isGap, heightCm }) => ({
    blockId,
    isGap,
    heightCm,
  }));
}

/** Scala sąsiadujące przerwy w jedną i usuwa przerwy zerowe. */
function mergeGaps(units: DesignerUnit[]): DesignerUnit[] {
  const out: DesignerUnit[] = [];
  for (const unit of units) {
    const last = out[out.length - 1];
    if (unit.isGap && last?.isGap) {
      out[out.length - 1] = {
        ...last,
        heightCm: last.heightCm + unit.heightCm,
      };
      continue;
    }
    out.push({ ...unit });
  }
  return out.filter((u) => !(u.isGap && u.heightCm <= 0));
}

function PostColumn({
  widthPx,
  bodyHeightPx,
  textureUrl,
}: {
  widthPx: number;
  bodyHeightPx: number;
  textureUrl: string | null;
}) {
  const bodyBg = textureUrl
    ? {
        backgroundImage: `url(${textureUrl})`,
        backgroundSize: "cover" as const,
      }
    : {
        backgroundImage:
          "linear-gradient(to right, #b6b6ba, #d0d0d4 30%, #c2c2c6 55%, #a6a6ab)",
      };

  return (
    <div className="flex shrink-0 flex-col justify-end" style={{ width: widthPx }}>
      <div
        className="w-full shrink-0 rounded-t-[3px] border border-black/15 shadow-sm"
        style={{
          height: bodyHeightPx,
          ...bodyBg,
        }}
      />
    </div>
  );
}

function SortableUnit({
  unit,
  index,
  totalCm,
  textureUrl,
  blockName,
  canAddPanel,
  readOnly,
  onRemove,
  onAddPanel,
}: {
  unit: DesignerUnit;
  index: number;
  totalCm: number;
  textureUrl: string | null;
  blockName: string;
  canAddPanel: boolean;
  readOnly?: boolean;
  onRemove: (index: number) => void;
  onAddPanel: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: unit.uid, disabled: readOnly || unit.isGap });

  const heightPct = (unit.heightCm / totalCm) * 100;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: `${heightPct}%`,
    minHeight: unit.isGap ? 12 : 26,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (unit.isGap) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative w-full shrink-0 border-y border-dashed border-[#9a9aa0] bg-[#fbfbfc]/70 ${
          !readOnly && canAddPanel ? "cursor-pointer hover:bg-emerald-50" : ""
        }`}
        onClick={() => !readOnly && canAddPanel && onAddPanel(index)}
        title={
          !readOnly && canAddPanel
            ? `Przerwa ${unit.heightCm} cm — kliknij, aby wstawić panel`
            : `Przerwa ${unit.heightCm} cm`
        }
      >
        <div className="flex h-full items-center justify-center gap-1.5">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#555] shadow-sm ring-1 ring-black/10">
            {unit.heightCm} cm
          </span>
          {!readOnly && canAddPanel && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <Plus className="h-3 w-3" />
              panel
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: "none" }}
      className={`group relative w-full shrink-0 overflow-hidden border-b border-black/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${
        readOnly ? "" : "cursor-grab active:cursor-grabbing"
      }`}
      title={`${blockName} (${unit.heightCm} cm) — przeciągnij, aby przestawić`}
      {...(readOnly ? {} : { ...attributes, ...listeners })}
    >
      {textureUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${textureUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#cfcfd3] via-[#b4b4ba] to-[#a2a2a8]" />
      )}
      <div className="relative flex h-full items-center justify-center gap-1.5 px-1">
        {!readOnly && (
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/80 drop-shadow" />
        )}
        <span className="truncate rounded bg-black/35 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {blockName} · {unit.heightCm} cm
        </span>
      </div>
      {!readOnly && (
        <button
          type="button"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md bg-black/45 p-1.5 text-white shadow-sm transition-colors hover:bg-red-600"
          title="Usuń panel (zostanie przerwa)"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function AzurowoscDesigner({
  variant,
  blocks,
  post,
  heightM,
  colors,
  catalog,
  initialLayout,
  initialColorId,
  readOnly = false,
  sectionWidthPx = 160,
  onChange,
}: Props) {
  const targetCm = Math.round(heightM * 100);
  const fullLayout = useMemo(
    () => buildFullStackLayout({ stack: variant.stack, blocks, heightM }),
    [variant.stack, blocks, heightM],
  );
  const totalPanels = fullLayout.length;

  const [units, setUnits] = useState<DesignerUnit[]>(() =>
    toDesignerUnits(initialLayout),
  );
  const [colorId, setColorId] = useState<string | null>(
    initialColorId ?? colors[0]?.id ?? null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const mainSlot = variant.stack.find((s) => s.mode === "repeat");
  const mainBlock = mainSlot
    ? blocks.find((b) => b.id === mainSlot.blockId)
    : undefined;

  const panelCount = countPanelsInLayout(fromDesignerUnits(units));
  const postTextureUrl = resolvePostTextureUrl(catalog, variant.postId, colorId);
  const postW = post?.widthCm ?? 20;

  const notify = useCallback(
    (next: DesignerUnit[], nextColorId: string | null) => {
      onChange?.(fromDesignerUnits(next), nextColorId);
    },
    [onChange],
  );

  function updateUnits(updater: (prev: DesignerUnit[]) => DesignerUnit[]) {
    setUnits((prev) => {
      const next = updater(prev);
      notify(next, colorId);
      return next;
    });
  }

  function handleColorChange(id: string | null) {
    setColorId(id);
    notify(units, id);
  }

  function removePanel(index: number) {
    updateUnits((prev) =>
      mergeGaps(
        prev.map((u, i) =>
          i === index ? { ...u, isGap: true, blockId: null } : u,
        ),
      ),
    );
  }

  function addPanelToGap(index: number) {
    if (!mainBlock) return;
    updateUnits((prev) => {
      const gap = prev[index];
      if (!gap?.isGap || gap.heightCm < mainBlock.heightCm) return prev;
      const rest = gap.heightCm - mainBlock.heightCm;
      const above = Math.floor(rest / 2);
      const below = rest - above;
      const inserted: DesignerUnit[] = [
        ...(above > 0
          ? [{ blockId: null, isGap: true, heightCm: above, uid: createSlotUid() }]
          : []),
        {
          blockId: mainBlock.id,
          isGap: false,
          heightCm: mainBlock.heightCm,
          uid: createSlotUid(),
        },
        ...(below > 0
          ? [{ blockId: null, isGap: true, heightCm: below, uid: createSlotUid() }]
          : []),
      ];
      return mergeGaps([
        ...prev.slice(0, index),
        ...inserted,
        ...prev.slice(index + 1),
      ]);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateUnits((prev) => {
      const oldIndex = prev.findIndex((u) => u.uid === active.id);
      const newIndex = prev.findIndex((u) => u.uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return mergeGaps(arrayMove(prev, oldIndex, newIndex));
    });
  }

  const previewH = readOnly
    ? Math.min(360, Math.max(200, targetCm * 1.4))
    : Math.min(520, Math.max(320, targetCm * 2));
  const sectionW = sectionWidthPx;
  const postPx = Math.max(14, (postW / 100) * (previewH / (targetCm / 100)) * 0.09);
  const postCm = resolvePostHeightCm(variant, heightM) ?? targetCm;
  const postBodyH = (postCm / targetCm) * previewH;
  const containerH = Math.max(postBodyH, previewH);

  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  return (
    <div className="space-y-4">
      {!readOnly && colors.length > 0 && (
        <div className="space-y-1.5">
          <Label>Kolor podglądu</Label>
          <Select
            value={colorId ?? ""}
            items={colors.map((c) => ({ value: c.id, label: c.name }))}
            onValueChange={(v) => handleColorChange(v || null)}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Wybierz kolor" />
            </SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Panele: <strong>{panelCount}</strong> / {totalPanels} (pełny stos)
        {!readOnly &&
          " · przeciągnij panel, aby zmienić jego pozycję; ikona kosza usuwa panel; kliknij przerwę, aby wstawić panel"}
      </p>

      <div className="flex flex-col items-center rounded-lg border bg-gradient-to-b from-[#eef1f4] to-[#e2e5e9] px-4 pt-6">
        <div
          className="flex items-end justify-center"
          style={{ height: containerH }}
        >
          <PostColumn
            widthPx={postPx}
            bodyHeightPx={postBodyH}
            textureUrl={postTextureUrl}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={units.map((u) => u.uid)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="flex flex-col overflow-hidden"
                style={{ width: sectionW, height: previewH }}
              >
                {units.map((unit, index) => {
                  const block = unit.blockId
                    ? blockMap.get(unit.blockId)
                    : undefined;
                  const textureUrl =
                    unit.blockId && !unit.isGap
                      ? resolveBlockTextureUrl(catalog, unit.blockId, colorId)
                      : null;
                  return (
                    <SortableUnit
                      key={unit.uid}
                      unit={unit}
                      index={index}
                      totalCm={targetCm}
                      textureUrl={textureUrl}
                      blockName={block?.name ?? "Panel"}
                      canAddPanel={Boolean(
                        mainBlock && unit.heightCm >= (mainBlock?.heightCm ?? 0),
                      )}
                      readOnly={readOnly}
                      onRemove={removePanel}
                      onAddPanel={addPanelToGap}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          <PostColumn
            widthPx={postPx}
            bodyHeightPx={postBodyH}
            textureUrl={postTextureUrl}
          />
        </div>
        <div
          className="h-2.5 rounded-b-lg bg-gradient-to-b from-[#8f9298] to-[#6f7278]"
          style={{ width: sectionW + postPx * 2 + 24, marginTop: 0 }}
        />
      </div>

      {!readOnly && (
        <p className="text-muted-foreground text-xs">
          Usunięty panel zostawia przerwę o tej samej wysokości — łączna
          wysokość ogrodzenia się nie zmienia. Sąsiednie przerwy łączą się
          automatycznie.
        </p>
      )}
    </div>
  );
}

export function validateAzurowoscLayout(
  layout: FenceAzurUnit[],
  heightM: number,
): { valid: boolean; message?: string } {
  const targetCm = Math.round(heightM * 100);
  const usedCm = layout.reduce((sum, u) => sum + u.heightCm, 0);
  const panelCount = countPanelsInLayout(layout);
  const remainder = targetCm - usedCm;

  if (panelCount === 0) {
    return { valid: false, message: "Zostaw co najmniej jeden panel" };
  }
  if (Math.abs(remainder) >= 2) {
    return {
      valid: false,
      message: `Układ zajmuje ${usedCm} cm z ${targetCm} cm`,
    };
  }
  return { valid: true };
}
