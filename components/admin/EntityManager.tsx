"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import type { CollectionName } from "@/lib/types";
import {
  fetchAllForAdmin,
  createEntity,
  updateEntity,
  deleteEntity,
} from "@/lib/api/client";
import { isApiConfigured } from "@/lib/api/client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PATTERN_OPTIONS } from "@/lib/fence/patterns";

type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "color";
  options?: { value: string; label: string }[];
};

type EntityManagerProps<
  T extends { id: string; active: boolean; sortOrder: number },
> = {
  collection: CollectionName;
  title: string;
  fields: FieldConfig[];
  schema: z.ZodType<Record<string, unknown>>;
  emptyItem: Record<string, unknown>;
};

export function EntityManager<
  T extends { id: string; active: boolean; sortOrder: number },
>({
  collection,
  title,
  fields,
  schema,
  emptyItem,
}: EntityManagerProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { user, getToken } = useAdminAuth();
  const canManage = isApiConfigured() && Boolean(user);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!isApiConfigured()) {
      setError(
        "API nie jest skonfigurowane. Ustaw NEXT_PUBLIC_API_URL i uruchom backend FastAPI.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await fetchAllForAdmin<T>(collection, token);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [collection, user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyItem });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    const { id: _id, ...rest } = item as T & { id: string };
    setForm(rest as Record<string, unknown>);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }
    if (!canManage) {
      setFormError("Musisz być zalogowany, aby zapisywać zmiany.");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      if (editing) {
        await updateEntity(collection, editing.id, parsed.data, token);
      } else {
        await createEntity(collection, parsed.data, token);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Usunąć ten wpis?")) return;
    if (!canManage) return;
    try {
      const token = await getToken();
      await deleteEntity(collection, id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
    }
  }

  function renderField(field: FieldConfig) {
    const value = form[field.name];
    if (field.type === "boolean") {
      return (
        <div key={field.name} className="flex items-center gap-2">
          <Switch
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, [field.name]: v }))
            }
          />
          <Label htmlFor={field.name}>{field.label}</Label>
        </div>
      );
    }
    if (field.type === "select") {
      const opts =
        field.name === "patternId"
          ? PATTERN_OPTIONS.map((p) => ({ value: p.id, label: p.label }))
          : (field.options ?? []);
      return (
        <div key={field.name} className="space-y-1.5">
          <Label>{field.label}</Label>
          <Select
            value={String(value ?? "")}
            onValueChange={(v) => setForm((f) => ({ ...f, [field.name]: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div key={field.name} className="space-y-1.5">
        <Label htmlFor={field.name}>{field.label}</Label>
        <Input
          id={field.name}
          type={
            field.type === "number"
              ? "number"
              : field.type === "color"
                ? "color"
                : "text"
          }
          value={String(value ?? "")}
          onChange={(e) => {
            const v =
              field.type === "number"
                ? Number(e.target.value)
                : e.target.value;
            setForm((f) => ({ ...f, [field.name]: v }));
          }}
          step={field.type === "number" ? "0.01" : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <Button onClick={openCreate} disabled={!canManage || !isApiConfigured()}>
          <Plus className="mr-1 h-4 w-4" />
          Dodaj
        </Button>
      </div>

      {error && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {fields.slice(0, 4).map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={fields.length + 2}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Brak wpisów
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    {fields.slice(0, 4).map((f) => (
                      <TableCell key={f.name}>
                        {f.type === "boolean"
                          ? String((item as Record<string, unknown>)[f.name])
                          : f.type === "color"
                            ? (
                                <span className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-5 w-5 rounded-full border"
                                    style={{
                                      backgroundColor: String(
                                        (item as Record<string, unknown>)[f.name],
                                      ),
                                    }}
                                  />
                                  {String((item as Record<string, unknown>)[f.name])}
                                </span>
                              )
                            : String((item as Record<string, unknown>)[f.name] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell>
                      {item.active ? (
                        <Badge>Aktywny</Badge>
                      ) : (
                        <Badge variant="secondary">Wyłączony</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edytuj wpis" : "Nowy wpis"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">{fields.map(renderField)}</div>
          {formError && (
            <p className="text-destructive text-sm">{formError}</p>
          )}
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


