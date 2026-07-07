"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { AssetUploader } from "@/components/admin/AssetUploader";
import { DecimalInput } from "@/components/configurator/DecimalInput";
import { Button } from "@/components/ui/button";
import {
  createEntity,
  deleteEntity,
  fetchAllForAdmin,
  isApiConfigured,
  updateEntity,
} from "@/lib/api/client";
import { catalogAssetPath } from "@/lib/firebase/storage";
import type { Color, Post, PostTexture } from "@/lib/types";

export function FencePostMatrix() {
  const { user, getToken } = useAdminAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [textures, setTextures] = useState<PostTexture[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
      const [p, c, t] = await Promise.all([
        fetchAllForAdmin<Post>("posts", token),
        fetchAllForAdmin<Color>("colors", token),
        fetchAllForAdmin<PostTexture>("postTextures", token),
      ]);
      setPosts(p);
      setColors(c.filter((col) => col.active));
      setTextures(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  function findTexture(postId: string, colorId: string) {
    return textures.find((t) => t.postId === postId && t.colorId === colorId);
  }

  async function saveTexture(
    postId: string,
    colorId: string,
    patch: Partial<PostTexture> & { imageUrl?: string },
  ) {
    const key = `post-${postId}-${colorId}`;
    setBusyKey(key);
    try {
      const token = await getToken();
      const existing = findTexture(postId, colorId);
      if (existing) {
        await updateEntity(
          "postTextures",
          existing.id,
          { ...existing, ...patch },
          token,
        );
      } else if (patch.imageUrl) {
        await createEntity(
          "postTextures",
          {
            postId,
            colorId,
            imageUrl: patch.imageUrl,
            priceNetPerPost: patch.priceNetPerPost ?? 0,
            sortOrder: 0,
          },
          token,
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeTexture(postId: string, colorId: string) {
    const existing = findTexture(postId, colorId);
    if (!existing) return;
    if (!confirm("Usunąć teksturę słupka?")) return;
    const key = `post-${postId}-${colorId}`;
    setBusyKey(key);
    try {
      const token = await getToken();
      await deleteEntity("postTextures", existing.id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">Słupki × kolory</h2>
        <p className="text-muted-foreground text-sm">
          Zdjęcia i ceny netto za jeden słupek w danym kolorze.
        </p>
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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-[#f9fafb]">
                <th className="sticky left-0 z-10 bg-[#f9fafb] px-3 py-2 text-left">
                  Słupek
                </th>
                {colors.map((color) => (
                  <th key={color.id} className="min-w-[140px] px-2 py-2 text-center">
                    <span
                      className="inline-block h-5 w-5 rounded-full border"
                      style={{ backgroundColor: color.hex }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 font-medium">
                    {post.name}
                  </td>
                  {colors.map((color) => {
                    const texture = findTexture(post.id, color.id);
                    const cellKey = `post-${post.id}-${color.id}`;
                    const isBusy = busyKey === cellKey;
                    return (
                      <td key={color.id} className="px-2 py-2 align-top">
                        <div className="flex flex-col items-center gap-2">
                          <AssetUploader
                            value={texture?.imageUrl}
                            storagePath={catalogAssetPath(
                              "posts",
                              post.id,
                              "colors",
                              color.id,
                            )}
                            disabled={!canManage || isBusy}
                            onChange={(url) =>
                              saveTexture(post.id, color.id, {
                                imageUrl: url,
                                priceNetPerPost: texture?.priceNetPerPost ?? 0,
                              })
                            }
                          />
                          <DecimalInput
                            value={texture?.priceNetPerPost ?? 0}
                            onChange={(v) =>
                              texture &&
                              saveTexture(post.id, color.id, {
                                priceNetPerPost: v,
                              })
                            }
                            min={0}
                            suffix="PLN/szt."
                            variant="light"
                            className="w-full text-xs"
                          />
                          {texture && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!canManage || isBusy}
                              onClick={() => removeTexture(post.id, color.id)}
                            >
                              <Trash2 className="text-destructive h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
