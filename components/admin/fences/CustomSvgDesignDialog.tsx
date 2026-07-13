"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createEntity, isApiConfigured, updateEntity } from "@/lib/api/client";
import { buildCustomSvgPreview, sanitizeSvgMarkup } from "@/lib/fence/sanitizeSvg";
import { fenceBlockSchema } from "@/lib/validations";
import type { FenceBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

type InputMode = "paste" | "file";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: "standard" | "cap";
  sortOrder?: number;
  editingBlock?: FenceBlock | null;
  onSaved?: () => void;
};

export function CustomSvgDesignDialog({
  open,
  onOpenChange,
  initialRole = "standard",
  sortOrder = 0,
  editingBlock = null,
  onSaved,
}: Props) {
  const { getToken } = useAdminAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(editingBlock);

  const [name, setName] = useState("");
  const [heightCm, setHeightCm] = useState(initialRole === "cap" ? 25 : 50);
  const [role, setRole] = useState<"standard" | "cap">(initialRole);
  const [active, setActive] = useState(true);
  const [svgRaw, setSvgRaw] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingBlock) {
      setName(editingBlock.name);
      setHeightCm(editingBlock.heightCm);
      setRole(editingBlock.role);
      setActive(editingBlock.active);
      setSvgRaw(editingBlock.svgMarkup ?? "");
      setInputMode("paste");
      setFileName(null);
    } else {
      setName("");
      setHeightCm(initialRole === "cap" ? 25 : 50);
      setRole(initialRole);
      setActive(true);
      setSvgRaw("");
      setInputMode("paste");
      setFileName(null);
    }
    setError(null);
  }, [open, editingBlock, initialRole]);

  const sanitized = useMemo(
    () => (svgRaw.trim() ? sanitizeSvgMarkup(svgRaw) : ""),
    [svgRaw],
  );

  const previewSvg = useMemo(
    () => (sanitized ? buildCustomSvgPreview(sanitized) : ""),
    [sanitized],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg")) {
      setError("Obsługiwane są tylko pliki .svg");
      return;
    }
    try {
      const text = await file.text();
      setSvgRaw(text);
      setFileName(file.name);
      setInputMode("file");
      setError(null);
    } catch {
      setError("Nie udało się odczytać pliku");
    }
  }

  async function handleSave() {
    if (!isApiConfigured()) return;
    const payload = {
      name: name.trim(),
      heightCm,
      role,
      svgMarkup: sanitized,
      supportsAzurowosc: role === "standard",
      active,
      sortOrder: editingBlock?.sortOrder ?? sortOrder,
    };

    const parsed = fenceBlockSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (isEditing && editingBlock) {
        await updateEntity("fenceBlocks", editingBlock.id, parsed.data, token);
      } else {
        await createEntity("fenceBlocks", parsed.data, token);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj własny design SVG" : "Dodaj własny design SVG"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-svg-name">Nazwa panelu</Label>
              <Input
                id="custom-svg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Deska własna"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-svg-height">Wysokość (cm)</Label>
              <Input
                id="custom-svg-height"
                type="number"
                min={5}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={role === "standard" ? "default" : "outline"}
              onClick={() => setRole("standard")}
            >
              Panel główny
            </Button>
            <Button
              type="button"
              size="sm"
              variant={role === "cap" ? "default" : "outline"}
              onClick={() => setRole("cap")}
            >
              Panel górny
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="custom-svg-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="custom-svg-active">Aktywny w katalogu</Label>
          </div>

          <div className="flex gap-2 border-b border-[#e5e7eb]">
            <button
              type="button"
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                inputMode === "paste"
                  ? "border-b-2 border-[#ff3131] text-[#303638]"
                  : "text-[#6b7280] hover:text-[#303638]",
              )}
              onClick={() => setInputMode("paste")}
            >
              Wklej kod SVG
            </button>
            <button
              type="button"
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                inputMode === "file"
                  ? "border-b-2 border-[#ff3131] text-[#303638]"
                  : "text-[#6b7280] hover:text-[#303638]",
              )}
              onClick={() => setInputMode("file")}
            >
              Wgraj plik .svg
            </button>
          </div>

          {inputMode === "paste" ? (
            <div className="space-y-1.5">
              <Label htmlFor="custom-svg-code">Kod SVG</Label>
              <textarea
                id="custom-svg-code"
                value={svgRaw}
                onChange={(e) => setSvgRaw(e.target.value)}
                rows={10}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-lg border px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:outline-none"
                placeholder='<svg viewBox="0 0 100 100">...</svg>'
              />
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Wybierz plik .svg
              </Button>
              {fileName && (
                <p className="text-muted-foreground text-xs">Wczytano: {fileName}</p>
              )}
              {svgRaw && (
                <textarea
                  value={svgRaw}
                  onChange={(e) => setSvgRaw(e.target.value)}
                  rows={6}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-xs"
                  aria-label="Podgląd wczytanego SVG"
                />
              )}
            </div>
          )}

          <div className="rounded-xl border border-[#e5e7eb] bg-gradient-to-b from-[#eef1f4] to-[#e2e5e9] p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9ca3af]">
              Podgląd
            </p>
            <div
              className="h-40 w-full [&>svg]:mx-auto [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{
                __html:
                  previewSvg ||
                  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="100%" height="100%"><text x="100" y="60" text-anchor="middle" fill="#9ca3af" font-size="12">Wklej lub wgraj SVG</text></svg>`,
              }}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !sanitized}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Zapisuję…
              </>
            ) : (
              "Zapisz panel"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
