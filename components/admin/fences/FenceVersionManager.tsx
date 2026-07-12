"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FenceBlock, FenceStackVersion, FenceVariant } from "@/lib/types";
import {
  createDefaultStackVersion,
  getStackVersions,
  patchStackVersion,
} from "@/lib/fence/stackVersions";
import { getAzurGapOptions } from "@/lib/fence/resolveStack";
import { FenceStackEditor } from "./FenceStackEditor";
import { ensureSlotUids } from "@/lib/fence/slotUid";

type Props = {
  variant: FenceVariant;
  blocksCatalog: FenceBlock[];
  previewHeightM: number;
  referenceHeightM: number;
  activeVersionId: string;
  onActiveVersionChange: (versionId: string) => void;
  onVariantChange: (variant: FenceVariant) => void;
  onAddBlock?: (role: "standard" | "cap") => void;
  onOpenAzurowosc: (versionId: string) => void;
};

export function FenceVersionManager({
  variant,
  blocksCatalog,
  previewHeightM,
  referenceHeightM,
  activeVersionId,
  onActiveVersionChange,
  onVariantChange,
  onAddBlock,
  onOpenAzurowosc,
}: Props) {
  const versions = getStackVersions(variant);
  const activeVersion =
    versions.find((v) => v.id === activeVersionId) ?? versions[0];

  function updateVersion(
    versionId: string,
    patch: Partial<FenceStackVersion>,
  ) {
    onVariantChange(patchStackVersion(variant, versionId, patch));
  }

  function handleAddVersion() {
    const source = versions[versions.length - 1];
    const next = createDefaultStackVersion(versions.length, source);
    const stackVersions = [...versions, next];
    onVariantChange({
      ...variant,
      stackVersions,
    });
    onActiveVersionChange(next.id);
  }

  function handleRemoveVersion(versionId: string) {
    if (versions.length <= 1) return;
    const stackVersions = versions
      .filter((v) => v.id !== versionId)
      .map((v, i) => ({ ...v, sortOrder: i }));
    onVariantChange({ ...variant, stackVersions });
    if (activeVersionId === versionId) {
      onActiveVersionChange(stackVersions[0]?.id ?? "");
    }
  }

  const azurowoscSummary =
    activeVersion.azurowoscEnabled && getAzurGapOptions(activeVersion).length
      ? getAzurGapOptions(activeVersion)
          .map((g) => `${g} cm`)
          .join(", ")
      : null;

  const [postHeightInput, setPostHeightInput] = useState("");

  useEffect(() => {
    const offset = activeVersion.postHeightOffsetCm;
    setPostHeightInput(
      offset == null
        ? ""
        : ((referenceHeightM * 100 + offset) / 100)
            .toString()
            .replace(".", ","),
    );
  }, [activeVersion.id, activeVersion.postHeightOffsetCm, referenceHeightM]);

  function handlePostHeightChange(raw: string) {
    setPostHeightInput(raw);
    if (raw.trim() === "") {
      updateVersion(activeVersion.id, {
        postHeightOffsetCm: null,
        postHeightCm: null,
      });
      return;
    }
    const parsedM = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsedM) || parsedM <= 0) return;
    const offset = Math.round(parsedM * 100 - referenceHeightM * 100);
    if (offset < -150 || offset > 150) return;
    updateVersion(activeVersion.id, {
      postHeightOffsetCm: offset,
      postHeightCm: null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Układ paneli</h3>
          <p className="text-muted-foreground text-sm">
            Każda wersja ma własny układ paneli i osobną ażurowość (A/B/C).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {versions.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => onActiveVersionChange(version.id)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              version.id === activeVersion.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40",
            )}
          >
            {version.name}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddVersion}
        >
          <Plus className="mr-1 h-4 w-4" />
          Dodaj wariant
        </Button>
      </div>

      {activeVersion && (
        <div className="space-y-3 rounded-lg border bg-[#fafafa] p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[180px] flex-1">
              <Input
                value={activeVersion.name}
                onChange={(e) =>
                  updateVersion(activeVersion.id, { name: e.target.value })
                }
                className="font-medium"
                aria-label="Nazwa wersji"
              />
            </div>
            {versions.length > 1 && activeVersion.id !== versions[0]?.id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleRemoveVersion(activeVersion.id)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Usuń wersję
              </Button>
            )}
          </div>

          <FenceStackEditor
            stack={activeVersion.stack}
            blocksCatalog={blocksCatalog}
            previewHeightM={previewHeightM}
            azurowoscEnabled={activeVersion.azurowoscEnabled}
            azurowoscSummary={azurowoscSummary}
            embedded
            onChange={(stack) =>
              updateVersion(activeVersion.id, {
                stack: ensureSlotUids(stack),
              })
            }
            onAzurowoscEnabledChange={(enabled) =>
              updateVersion(activeVersion.id, {
                azurowoscEnabled: enabled,
                azurowoscOptions: enabled
                  ? activeVersion.azurowoscOptions ?? []
                  : [],
              })
            }
            onAddBlock={onAddBlock}
            onOpenAzurowosc={() => onOpenAzurowosc(activeVersion.id)}
          />

          <div className="space-y-1.5 rounded-lg border bg-background p-3">
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
              {activeVersion.postHeightOffsetCm != null &&
                ` (obecnie ${activeVersion.postHeightOffsetCm > 0 ? "+" : ""}${activeVersion.postHeightOffsetCm} cm)`}
              . Ustawienie dotyczy tylko tej wersji układu paneli (
              {activeVersion.name}).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
