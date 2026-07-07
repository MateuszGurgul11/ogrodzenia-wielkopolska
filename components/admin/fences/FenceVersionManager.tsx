"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FenceBlock, FenceStackVersion, FenceVariant } from "@/lib/types";
import {
  MAX_STACK_VERSIONS,
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
    if (versions.length >= MAX_STACK_VERSIONS) return;
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
        {versions.length < MAX_STACK_VERSIONS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddVersion}
          >
            <Plus className="mr-1 h-4 w-4" />
            Dodaj wariant
          </Button>
        )}
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
        </div>
      )}
    </div>
  );
}
