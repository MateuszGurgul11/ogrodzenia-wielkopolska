"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createEntity, isApiConfigured, updateEntity } from "@/lib/api/client";
import {
  buildFenceSvg,
  getFenceContentBounds,
  getViewWidth,
  VIEW_H,
} from "@/lib/fence/renderFence";
import {
  type PanelPresetKey,
  defaultPresetKeyForRole,
  presetRoleFromKey,
  presetsForRole,
} from "@/lib/fence/patterns";
import { fenceBlockSchema } from "@/lib/validations";
import type { FenceBlock } from "@/lib/types";

const PREVIEW_COLOR = "#b0b0b4";

type FormState = {
  name: string;
  heightCm: number;
  patternKey: PanelPresetKey;
  role: "standard" | "cap";
  supportsAzurowosc: boolean;
  active: boolean;
  sortOrder: number;
};

function defaultForm(
  role: "standard" | "cap" = "standard",
  sortOrder = 0,
): FormState {
  return {
    name: "",
    heightCm: 50,
    patternKey: defaultPresetKeyForRole(role),
    role,
    supportsAzurowosc: true,
    active: true,
    sortOrder,
  };
}

function formFromBlock(block: FenceBlock): FormState {
  return {
    name: block.name,
    heightCm: block.heightCm,
    patternKey: block.patternKey ?? "concrete-standard",
    role: block.role,
    supportsAzurowosc: block.supportsAzurowosc,
    active: block.active,
    sortOrder: block.sortOrder,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBlock?: FenceBlock | null;
  initialRole?: "standard" | "cap";
  sortOrder?: number;
  onSaved?: () => void;
  /** @deprecated Użyj onSaved */
  onCreated?: (block: FenceBlock) => void;
};

export function FenceBlockForm({
  open,
  onOpenChange,
  editingBlock = null,
  initialRole = "standard",
  sortOrder = 0,
  onSaved,
  onCreated,
}: Props) {
  const { getToken } = useAdminAuth();
  const [form, setForm] = useState<FormState>(() =>
    defaultForm(initialRole, sortOrder),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(editingBlock);

  useEffect(() => {
    if (!open) return;
    if (editingBlock) {
      setForm(formFromBlock(editingBlock));
    } else {
      setForm(defaultForm(initialRole, sortOrder));
    }
    setError(null);
  }, [open, editingBlock, initialRole, sortOrder]);

  const availablePresets = useMemo(
    () => presetsForRole(form.role),
    [form.role],
  );

  const previewSvg = useMemo(() => {
    const heightM = Math.max(form.heightCm, 10) / 100;
    const svg = buildFenceSvg({
      heightM,
      patternId: "pattern-solid",
      colorHex: PREVIEW_COLOR,
      postWidthCm: 20,
      panelCount: 1,
      transparent: true,
      stackUnits: [
        {
          heightCm: form.heightCm,
          gapAfterCm: 0,
          isGap: false,
          role: form.role,
          patternKey: form.patternKey,
          seed: 0,
        },
      ],
    });
    const viewW = getViewWidth(1);
    const bounds = getFenceContentBounds({
      heightM,
      postWidthCm: 20,
      panelCount: 1,
    });
    const pad = 6;
    const vb = `${(bounds.x - pad).toFixed(1)} ${(bounds.y - pad).toFixed(1)} ${(bounds.width + pad * 2).toFixed(1)} ${(bounds.height + pad * 2).toFixed(1)}`;
    return svg.replace(
      `viewBox="0 0 ${viewW} ${VIEW_H}"`,
      `viewBox="${vb}"`,
    );
  }, [form.heightCm, form.patternKey, form.role]);

  async function handleSave() {
    const parsed = fenceBlockSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }
    if (!isApiConfigured()) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (isEditing && editingBlock) {
        await updateEntity("fenceBlocks", editingBlock.id, parsed.data, token);
        onCreated?.({
          id: editingBlock.id,
          name: parsed.data.name,
          heightCm: parsed.data.heightCm,
          role: parsed.data.role,
          patternKey: parsed.data.patternKey,
          supportsAzurowosc: parsed.data.supportsAzurowosc,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
          description: parsed.data.description,
          baseTextureUrl: parsed.data.baseTextureUrl ?? undefined,
        });
      } else {
        const created = await createEntity("fenceBlocks", parsed.data, token);
        onCreated?.({
          id: created.id,
          name: parsed.data.name,
          heightCm: parsed.data.heightCm,
          role: parsed.data.role,
          patternKey: parsed.data.patternKey,
          supportsAzurowosc: parsed.data.supportsAzurowosc,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
          description: parsed.data.description,
          baseTextureUrl: parsed.data.baseTextureUrl ?? undefined,
        });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edytuj panel" : "Nowy panel"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label>Nazwa</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="np. Panel A"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preset wyglądu</Label>
            <Select
              value={form.patternKey}
              items={availablePresets.map((p) => ({
                value: p.key,
                label: p.label,
              }))}
              onValueChange={(v) => {
                if (!v) return;
                const key = v as PanelPresetKey;
                setForm((f) => ({
                  ...f,
                  patternKey: key,
                  role: presetRoleFromKey(key),
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePresets.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Wysokość (cm)</Label>
            <Input
              type="number"
              value={form.heightCm}
              onChange={(e) =>
                setForm((f) => ({ ...f, heightCm: Number(e.target.value) }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Np. 50 cm → 4 płyty na 2 m; 25 cm → 8 płyt na 2 m.
            </p>
          </div>
          {previewSvg && (
            <div className="space-y-1.5">
              <Label>Podgląd</Label>
              <div
                className="mx-auto h-44 w-full overflow-hidden rounded-lg border bg-[#2a2a2e] p-3 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={form.supportsAzurowosc}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, supportsAzurowosc: v }))
              }
            />
            <Label>Obsługuje ażurowość</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
            />
            <Label>Aktywny</Label>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
