"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FenceBlock, FenceStackSlot } from "@/lib/types";
import { validateStack } from "@/lib/fence/resolveStack";
import { createSlotUid } from "@/lib/fence/slotUid";

const SAME_AS_MAIN = "same-as-main";

type SelectItemDef = { value: string; label: string };

type Props = {
  stack: FenceStackSlot[];
  blocksCatalog: FenceBlock[];
  previewHeightM: number;
  azurowoscEnabled: boolean;
  azurowoscSummary?: string | null;
  onChange: (stack: FenceStackSlot[]) => void;
  onAzurowoscEnabledChange: (enabled: boolean) => void;
  onAddBlock?: (role: "standard" | "cap") => void;
  onAddCustomSvg?: (role: "standard" | "cap") => void;
  onOpenAzurowosc: () => void;
  /** Ukrywa nagłówek sekcji ażurowości (np. w drawerze). */
  embedded?: boolean;
};

function BlockSelect({
  value,
  items,
  onValueChange,
  placeholder = "Wybierz panel",
}: {
  value: string;
  items: SelectItemDef[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} items={items} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function blockLabel(block: FenceBlock): string {
  const base = `${block.name} (${block.heightCm} cm)`;
  return block.svgMarkup ? `${base} · Własny SVG` : base;
}

function buildStack(
  top: FenceStackSlot | undefined,
  main: FenceStackSlot | undefined,
): FenceStackSlot[] {
  return [...(top ? [top] : []), ...(main ? [main] : [])];
}

export function FenceStackEditor({
  stack,
  blocksCatalog,
  previewHeightM,
  azurowoscEnabled,
  azurowoscSummary,
  onChange,
  onAzurowoscEnabledChange,
  onAddBlock,
  onAddCustomSvg,
  onOpenAzurowosc,
  embedded = false,
}: Props) {
  const topSlot = stack.find((s) => s.mode === "once");
  const mainSlot = stack.find((s) => s.mode === "repeat");

  const mainBlocks = blocksCatalog.filter((b) => b.role === "standard");
  const capBlocks = blocksCatalog.filter((b) => b.role === "cap");

  const validation = validateStack({
    heightM: previewHeightM,
    stack,
    blocks: blocksCatalog,
    azurowoscEnabled: false,
    gapCm: 0,
  });

  const mainItems: SelectItemDef[] = mainBlocks.map((b) => ({
    value: b.id,
    label: blockLabel(b),
  }));

  if (
    mainSlot?.blockId &&
    !mainItems.some((i) => i.value === mainSlot.blockId)
  ) {
    const orphan = blocksCatalog.find((b) => b.id === mainSlot.blockId);
    mainItems.unshift({
      value: mainSlot.blockId,
      label: orphan ? `${blockLabel(orphan)} (legacy)` : mainSlot.blockId,
    });
  }

  const topItems: SelectItemDef[] = [
    ...(mainSlot?.blockId
      ? [{ value: SAME_AS_MAIN, label: "Taki sam jak główny" }]
      : []),
    ...capBlocks.map((b) => ({
      value: b.id,
      label: blockLabel(b),
    })),
  ];

  if (
    topSlot &&
    topSlot.blockId &&
    !topItems.some((i) => i.value === topSlot.blockId)
  ) {
    const orphan = blocksCatalog.find((b) => b.id === topSlot.blockId);
    topItems.push({
      value: topSlot.blockId,
      label: orphan ? `${blockLabel(orphan)} (legacy)` : topSlot.blockId,
    });
  }

  const topSelectValue =
    !topSlot || topSlot.mirrorsMain ? SAME_AS_MAIN : topSlot.blockId;

  function setTopBlock(value: string) {
    if (value === SAME_AS_MAIN) {
      onChange(buildStack(undefined, mainSlot));
      return;
    }
    const next: FenceStackSlot = topSlot
      ? { ...topSlot, blockId: value, mode: "once", mirrorsMain: false }
      : { uid: createSlotUid(), blockId: value, mode: "once", mirrorsMain: false };
    onChange(buildStack(next, mainSlot));
  }

  function setMainBlock(blockId: string) {
    const nextMain: FenceStackSlot = mainSlot
      ? { ...mainSlot, blockId, mode: "repeat" }
      : { uid: createSlotUid(), blockId, mode: "repeat" };

    const nextTop = topSlot?.mirrorsMain ? undefined : topSlot;

    onChange(buildStack(nextTop, nextMain));
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h3 className="font-medium">Układ paneli</h3>
          <p className="text-muted-foreground text-sm">
            Panel górny to pojedyncza płyta na szczycie (np. z falą), panele
            główne wypełniają resztę wysokości.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border bg-[#fafafa] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={azurowoscEnabled}
              onCheckedChange={onAzurowoscEnabledChange}
            />
            <Label className="font-medium">Ażurowość w wariancie</Label>
          </div>
          <p className="text-muted-foreground text-xs">
            Niezależnie od tego, czy panele mogą mieć przerwy.
          </p>
        </div>
        {azurowoscEnabled ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenAzurowosc}
            >
              Ustaw ażurowość
            </Button>
            {azurowoscSummary ? (
              <span className="text-sm">
                Skonfigurowane: <strong>{azurowoscSummary}</strong>
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">
                Dodaj dostępne przerwy (cm)
              </span>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Wariant bez ażurowości — w konfiguratorze klient wybierze tylko
            układ szczelny.
          </p>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-white p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Panel górny (opcjonalny)</Label>
          <BlockSelect
            value={topSelectValue}
            items={topItems}
            onValueChange={setTopBlock}
          />
          {onAddBlock && (
            <div className="flex flex-wrap gap-x-3">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                onClick={() => onAddBlock("cap")}
              >
                <Plus className="mr-1 h-3 w-3" />
                Nowy panel górny
              </Button>
              {onAddCustomSvg && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={() => onAddCustomSvg("cap")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Własny design SVG
                </Button>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Panel górny (cap) lub ten sam układ co panele główne bez osobnej
            płyty dekoracyjnej.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Panele główne</Label>
          <BlockSelect
            value={mainSlot?.blockId ?? ""}
            items={mainItems}
            onValueChange={setMainBlock}
            placeholder="Wybierz panel główny"
          />
          {onAddBlock && (
            <div className="flex flex-wrap gap-x-3">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                onClick={() => onAddBlock("standard")}
              >
                <Plus className="mr-1 h-3 w-3" />
                Nowy panel główny
              </Button>
              {onAddCustomSvg && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={() => onAddCustomSvg("standard")}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Własny design SVG
                </Button>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Powtarzane do wypełnienia wysokości ogrodzenia.
          </p>
        </div>
      </div>

      <div
        className={`rounded-md px-3 py-2 text-sm ${
          validation.valid
            ? "border border-green-200 bg-green-50 text-green-800"
            : "border border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {validation.valid
          ? `Stos pasuje do ${previewHeightM} m (${validation.usedHeightCm} cm)`
          : validation.message}
      </div>
    </div>
  );
}
