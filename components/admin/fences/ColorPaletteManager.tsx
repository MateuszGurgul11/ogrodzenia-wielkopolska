"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  createEntity,
  deleteEntity,
  fetchAllForAdmin,
  isApiConfigured,
  updateEntity,
} from "@/lib/api/client";
import { colorSchema } from "@/lib/validations";
import type { Color } from "@/lib/types";

export function ColorPaletteManager() {
  const { user, getToken } = useAdminAuth();
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [form, setForm] = useState({ name: "", hex: "#9ca3af", active: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = isApiConfigured() && Boolean(user);

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const data = await fetchAllForAdmin<Color>("colors", token);
      setColors(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania kolorów");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      hex: "#9ca3af",
      active: true,
      sortOrder: colors.length,
    });
    setDialogOpen(true);
  }

  function openEdit(color: Color) {
    setEditing(color);
    setForm({
      name: color.name,
      hex: color.hex,
      active: color.active,
      sortOrder: color.sortOrder,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const parsed = colorSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (editing) {
        await updateEntity("colors", editing.id, parsed.data, token);
      } else {
        await createEntity("colors", parsed.data, token);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Usunąć ten kolor?")) return;
    try {
      const token = await getToken();
      await deleteEntity("colors", id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Paleta kolorów</h2>
          <p className="text-muted-foreground text-sm">
            Kolory używane w macierzach tekstur i cen.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!canManage} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Dodaj kolor
        </Button>
      </div>

      {error && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <div
              key={color.id}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
            >
              <span
                className="h-8 w-8 rounded-md border"
                style={{ backgroundColor: color.hex }}
              />
              <div>
                <p className="text-sm font-medium">{color.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{color.hex}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(color)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(color.id)}>
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj kolor" : "Nowy kolor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nazwa</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kolor</Label>
              <Input
                type="color"
                value={form.hex}
                onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label>Aktywny</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
