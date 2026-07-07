"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEntity,
  deleteEntity,
  fetchAllForAdmin,
  isApiConfigured,
} from "@/lib/api/client";
import { postSchema } from "@/lib/validations";
import type { Post } from "@/lib/types";

export function FencePostManager() {
  const { user, getToken } = useAdminAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    widthCm: 20,
    sortOrder: 0,
    active: true,
  });
  const canManage = isApiConfigured() && Boolean(user);

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const list = await fetchAllForAdmin<Post>("posts", token);
      setPosts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania słupków");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!canManage) return;
    if (!confirm(`Usunąć słupek „${name}"?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const token = await getToken();
      await deleteEntity("posts", id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate() {
    const parsed = postSchema.safeParse({
      ...form,
      priceSurchargePerMeter: 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await createEntity("posts", parsed.data, token);
      setFormOpen(false);
      setForm({ name: "", slug: "", widthCm: 20, sortOrder: 0, active: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Słupki</h2>
          <p className="text-muted-foreground text-sm">
            Modele słupków. Tekstury i ceny per kolor ustaw w macierzy poniżej.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!canManage}
          onClick={() => setFormOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nowy słupek
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
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Brak słupków. Dodaj pierwszy.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{post.name}</CardTitle>
                    <CardDescription>{post.widthCm} cm szerokości</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={!canManage || deletingId === post.id}
                    onClick={() => handleDelete(post.id, post.name)}
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="text-destructive h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {post.active ? (
                  <Badge>Aktywny</Badge>
                ) : (
                  <Badge variant="secondary">Wyłączony</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy słupek</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nazwa</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug:
                      f.slug ||
                      name
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                  }));
                }}
                placeholder="np. Słupek standard"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="standard"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Szerokość (cm)</Label>
              <Input
                type="number"
                value={form.widthCm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, widthCm: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
