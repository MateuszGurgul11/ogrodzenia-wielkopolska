"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { AssetUploader } from "@/components/admin/AssetUploader";
import { Button } from "@/components/ui/button";
import {
  createEntity,
  deleteEntity,
  fetchAllForAdmin,
  isApiConfigured,
  updateEntity,
} from "@/lib/api/client";
import { catalogAssetPath } from "@/lib/firebase/storage";
import type {
  Color,
  Panel,
  PanelTexture,
  Post,
  PostTexture,
} from "@/lib/types";

type Tab = "panels" | "posts";

export default function AdminTexturesPage() {
  const { user, getToken } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("panels");
  const [panels, setPanels] = useState<Panel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [panelTextures, setPanelTextures] = useState<PanelTexture[]>([]);
  const [postTextures, setPostTextures] = useState<PostTexture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

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
      const [p, c, pt, po, pot] = await Promise.all([
        fetchAllForAdmin<Panel>("panels", token),
        fetchAllForAdmin<Color>("colors", token),
        fetchAllForAdmin<PanelTexture>("panelTextures", token),
        fetchAllForAdmin<Post>("posts", token),
        fetchAllForAdmin<PostTexture>("postTextures", token),
      ]);
      setPanels(p);
      setColors(c.filter((col) => col.active));
      setPanelTextures(pt);
      setPosts(po);
      setPostTextures(pot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  function findPanelTexture(panelId: string, colorId: string) {
    return panelTextures.find(
      (t) => t.panelId === panelId && t.colorId === colorId,
    );
  }

  function findPostTexture(postId: string, colorId: string) {
    return postTextures.find(
      (t) => t.postId === postId && t.colorId === colorId,
    );
  }

  async function savePanelTexture(
    panelId: string,
    colorId: string,
    imageUrl: string,
  ) {
    const key = `panel-${panelId}-${colorId}`;
    setBusyKey(key);
    try {
      const token = await getToken();
      const existing = findPanelTexture(panelId, colorId);
      if (existing) {
        await updateEntity(
          "panelTextures",
          existing.id,
          { ...existing, imageUrl },
          token,
        );
      } else {
        await createEntity(
          "panelTextures",
          { panelId, colorId, imageUrl, sortOrder: 0 },
          token,
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu tekstury");
    } finally {
      setBusyKey(null);
    }
  }

  async function removePanelTexture(panelId: string, colorId: string) {
    const existing = findPanelTexture(panelId, colorId);
    if (!existing) return;
    if (!confirm("Usunąć teksturę dla tej pary panel × kolor?")) return;
    const key = `panel-${panelId}-${colorId}`;
    setBusyKey(key);
    try {
      const token = await getToken();
      await deleteEntity("panelTextures", existing.id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
    } finally {
      setBusyKey(null);
    }
  }

  async function savePostTexture(
    postId: string,
    colorId: string,
    imageUrl: string,
  ) {
    const key = `post-${postId}-${colorId}`;
    setBusyKey(key);
    try {
      const token = await getToken();
      const existing = findPostTexture(postId, colorId);
      if (existing) {
        await updateEntity(
          "postTextures",
          existing.id,
          { ...existing, imageUrl },
          token,
        );
      } else {
        await createEntity(
          "postTextures",
          { postId, colorId, imageUrl, sortOrder: 0 },
          token,
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu tekstury");
    } finally {
      setBusyKey(null);
    }
  }

  async function removePostTexture(postId: string, colorId: string) {
    const existing = findPostTexture(postId, colorId);
    if (!existing) return;
    if (!confirm("Usunąć teksturę dla tej pary słupek × kolor?")) return;
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

  const rowItems = tab === "panels" ? panels : posts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Tekstury</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Macierz zdjęć panel × kolor i słupek × kolor. Brak komórki → w
          konfiguratorze używane jest{" "}
          <Link href="/admin/panels" className="text-primary underline">
            bazowe zdjęcie panelu
          </Link>{" "}
          lub wzór SVG.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "panels" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("panels")}
        >
          Panele × kolory
        </Button>
        <Button
          variant={tab === "posts" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("posts")}
        >
          Słupki × kolory
        </Button>
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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-[#f9fafb]">
                <th className="sticky left-0 z-10 bg-[#f9fafb] px-3 py-2 text-left font-medium">
                  {tab === "panels" ? "Panel" : "Słupek"}
                </th>
                {colors.map((color) => (
                  <th
                    key={color.id}
                    className="min-w-[120px] px-2 py-2 text-center font-medium"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <span
                        className="inline-block h-5 w-5 rounded-full border"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs">{color.name}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowItems.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 font-medium">
                    {row.name}
                  </td>
                  {colors.map((color) => {
                    const cellKey =
                      tab === "panels"
                        ? `panel-${row.id}-${color.id}`
                        : `post-${row.id}-${color.id}`;
                    const texture =
                      tab === "panels"
                        ? findPanelTexture(row.id, color.id)
                        : findPostTexture(row.id, color.id);
                    const storagePath =
                      tab === "panels"
                        ? catalogAssetPath(
                            "panels",
                            row.id,
                            "colors",
                            color.id,
                          )
                        : catalogAssetPath(
                            "posts",
                            row.id,
                            "colors",
                            color.id,
                          );
                    const isBusy = busyKey === cellKey;

                    return (
                      <td key={color.id} className="px-2 py-2 align-top">
                        <div className="flex flex-col items-center gap-1">
                          <AssetUploader
                            value={texture?.imageUrl}
                            storagePath={storagePath}
                            disabled={!canManage || isBusy}
                            onChange={(url) =>
                              tab === "panels"
                                ? savePanelTexture(row.id, color.id, url)
                                : savePostTexture(row.id, color.id, url)
                            }
                          />
                          {texture && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!canManage || isBusy}
                              onClick={() =>
                                tab === "panels"
                                  ? removePanelTexture(row.id, color.id)
                                  : removePostTexture(row.id, color.id)
                              }
                              aria-label="Usuń teksturę"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="text-destructive h-3.5 w-3.5" />
                              )}
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
