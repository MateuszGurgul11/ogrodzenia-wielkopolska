"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { ColorPaletteManager } from "@/components/admin/fences/ColorPaletteManager";
import { FenceBlockManager } from "@/components/admin/fences/FenceBlockManager";
import { FencePostManager } from "@/components/admin/fences/FencePostManager";
import { FencePostMatrix } from "@/components/admin/fences/FencePostMatrix";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createEntity,
  deleteEntity,
  fetchAllForAdmin,
  isApiConfigured,
} from "@/lib/api/client";
import type { FenceBlock, FenceVariant, Post } from "@/lib/types";
import { getStackVersions, createDefaultStackVersion } from "@/lib/fence/stackVersions";
import { cn } from "@/lib/utils";

export default function AdminFencesPage() {
  const { user, getToken } = useAdminAuth();
  const [variants, setVariants] = useState<FenceVariant[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blocks, setBlocks] = useState<FenceBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      const [v, p, b] = await Promise.all([
        fetchAllForAdmin<FenceVariant>("fenceVariants", token),
        fetchAllForAdmin<Post>("posts", token),
        fetchAllForAdmin<FenceBlock>("fenceBlocks", token),
      ]);
      setVariants(v);
      setPosts(p);
      setBlocks(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateVariant() {
    if (!canManage || posts.length === 0) return;
    const defaultBlock =
      blocks.find((b) => b.active && b.role === "standard") ?? blocks.find((b) => b.active);
    if (!defaultBlock) {
      setError("Dodaj najpierw co najmniej jeden panel główny w sekcji Panele.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const token = await getToken();
      const defaultVersion = createDefaultStackVersion(0, undefined, defaultBlock.id);
      const created = await createEntity(
        "fenceVariants",
        {
          name: "Nowy wariant",
          postId: posts[0].id,
          stack: defaultVersion.stack,
          stackVersions: [defaultVersion],
          azurowoscEnabled: false,
          heightIds: [],
          sectionWidthCm: 200,
          sortOrder: variants.length,
          active: false,
        },
        token,
      );
      window.location.href = `/admin/fences/${created.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć wariantu");
      setCreating(false);
    }
  }

  async function handleDeleteVariant(id: string, name: string) {
    if (!canManage) return;
    if (!confirm(`Usunąć wariant „${name}"?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const token = await getToken();
      await deleteEntity("fenceVariants", id, token);
      setVariants((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania wariantu");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Ogrodzenia</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Warianty, układ paneli, macierze kolorów i cen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleCreateVariant}
            disabled={!canManage || creating || posts.length === 0}
          >
            {creating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Nowy wariant
          </Button>
          <Link
            href="/admin/fences/gallery"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Galeria modeli
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((variant) => (
            <Card
              key={variant.id}
              className="relative h-full transition-shadow hover:shadow-md"
            >
              <Link href={`/admin/fences/${variant.id}`} className="block">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 pr-8">
                    <CardTitle className="text-lg">{variant.name}</CardTitle>
                    {variant.active ? (
                      <Badge>Aktywny</Badge>
                    ) : (
                      <Badge variant="secondary">Wyłączony</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {getStackVersions(variant).length} wersji ·{" "}
                    {variant.stack.length} slotów ·{" "}
                    {variant.azurowoscEnabled && variant.azurowoscOptions?.length
                      ? `ażur: ${variant.azurowoscOptions
                          .map((o) => `${o.gapCm} cm`)
                          .join(", ")}`
                      : "bez ażurowości"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-primary text-sm font-medium">
                    Edytuj →
                  </span>
                </CardContent>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8"
                disabled={!canManage || deletingId === variant.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleDeleteVariant(variant.id, variant.name);
                }}
              >
                {deletingId === variant.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="text-destructive h-4 w-4" />
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <FenceBlockManager />
      <FencePostManager />
      <ColorPaletteManager />
      <FencePostMatrix />
    </div>
  );
}
