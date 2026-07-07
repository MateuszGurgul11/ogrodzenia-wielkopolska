"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import type { Color, FenceBlock, FenceBlockTexture } from "@/lib/types";

export type FenceColorMatrixHandle = {
  save: () => Promise<void>;
  isDirty: () => boolean;
};

type Props = {
  blockIds: string[];
  /** Tylko ceny — bez wgrywania tekstur (proceduralny render). */
  pricesOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

function cellKey(blockId: string, colorId: string) {
  return `${blockId}:${colorId}`;
}

export const FenceColorMatrix = forwardRef<FenceColorMatrixHandle, Props>(
  function FenceColorMatrix(
    { blockIds, pricesOnly = false, onDirtyChange },
    ref,
  ) {
    const { user, getToken } = useAdminAuth();
    const [blocks, setBlocks] = useState<FenceBlock[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [textures, setTextures] = useState<FenceBlockTexture[]>([]);
    const [draftPrices, setDraftPrices] = useState<Record<string, number>>(
      {},
    );
    const [savedPrices, setSavedPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const dirtyRef = useRef(false);
    const canManage = isApiConfigured() && Boolean(user);

    const setDirty = useCallback(
      (dirty: boolean) => {
        dirtyRef.current = dirty;
        onDirtyChange?.(dirty);
      },
      [onDirtyChange],
    );

    const syncPricesFromTextures = useCallback(
      (blockList: FenceBlock[], colorList: Color[], textureList: FenceBlockTexture[]) => {
        const next: Record<string, number> = {};
        for (const block of blockList) {
          for (const color of colorList) {
            const key = cellKey(block.id, color.id);
            const texture = textureList.find(
              (t) => t.blockId === block.id && t.colorId === color.id,
            );
            next[key] = texture?.priceNetPerUnit ?? 0;
          }
        }
        setSavedPrices(next);
        setDraftPrices(next);
        setDirty(false);
      },
      [setDirty],
    );

    const load = useCallback(async () => {
      if (!user || !isApiConfigured()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = await getToken();
        const [b, c, t] = await Promise.all([
          fetchAllForAdmin<FenceBlock>("fenceBlocks", token),
          fetchAllForAdmin<Color>("colors", token),
          fetchAllForAdmin<FenceBlockTexture>("fenceBlockTextures", token),
        ]);
        const filteredBlocks = b.filter((block) => blockIds.includes(block.id));
        const filteredColors = c.filter((col) => col.active);
        setBlocks(filteredBlocks);
        setColors(filteredColors);
        setTextures(t);
        syncPricesFromTextures(filteredBlocks, filteredColors, t);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd ładowania macierzy");
      } finally {
        setLoading(false);
      }
    }, [user, getToken, blockIds, syncPricesFromTextures]);

    useEffect(() => {
      load();
    }, [load]);

    function findTexture(blockId: string, colorId: string) {
      return textures.find(
        (t) => t.blockId === blockId && t.colorId === colorId,
      );
    }

    function updateDraftPrice(blockId: string, colorId: string, value: number) {
      const key = cellKey(blockId, colorId);
      setDraftPrices((prev) => {
        const next = { ...prev, [key]: value };
        const dirty = Object.keys(next).some(
          (k) => (next[k] ?? 0) !== (savedPrices[k] ?? 0),
        );
        setDirty(dirty);
        return next;
      });
    }

    async function saveTexture(
      blockId: string,
      colorId: string,
      patch: Partial<FenceBlockTexture> & { imageUrl?: string },
    ) {
      const key = `${blockId}-${colorId}`;
      setBusyKey(key);
      try {
        const token = await getToken();
        const existing = findTexture(blockId, colorId);
        if (existing) {
          await updateEntity(
            "fenceBlockTextures",
            existing.id,
            { ...existing, ...patch },
            token,
          );
        } else if (
          patch.imageUrl !== undefined ||
          patch.priceNetPerUnit !== undefined
        ) {
          await createEntity(
            "fenceBlockTextures",
            {
              blockId,
              colorId,
              imageUrl: patch.imageUrl ?? "",
              priceNetPerUnit: patch.priceNetPerUnit ?? 0,
              sortOrder: 0,
            },
            token,
          );
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd zapisu");
        throw e;
      } finally {
        setBusyKey(null);
      }
    }

    const saveAllPrices = useCallback(async () => {
      if (!canManage) return;
      setError(null);
      const token = await getToken();
      const pending: Array<{ blockId: string; colorId: string; price: number }> =
        [];

      for (const block of blocks) {
        for (const color of colors) {
          const key = cellKey(block.id, color.id);
          const draft = draftPrices[key] ?? 0;
          const saved = savedPrices[key] ?? 0;
          if (draft !== saved) {
            pending.push({ blockId: block.id, colorId: color.id, price: draft });
          }
        }
      }

      if (pending.length === 0) {
        setDirty(false);
        return;
      }

      try {
        for (const { blockId, colorId, price } of pending) {
          const existing = textures.find(
            (t) => t.blockId === blockId && t.colorId === colorId,
          );
          if (existing) {
            await updateEntity(
              "fenceBlockTextures",
              existing.id,
              { ...existing, priceNetPerUnit: price },
              token,
            );
          } else if (price > 0) {
            await createEntity(
              "fenceBlockTextures",
              {
                blockId,
                colorId,
                imageUrl: "",
                priceNetPerUnit: price,
                sortOrder: 0,
              },
              token,
            );
          }
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd zapisu cen");
        throw e;
      }
    }, [
      blocks,
      canManage,
      colors,
      draftPrices,
      getToken,
      load,
      savedPrices,
      setDirty,
      textures,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        save: saveAllPrices,
        isDirty: () => dirtyRef.current,
      }),
      [saveAllPrices],
    );

    async function removeTexture(blockId: string, colorId: string) {
      const existing = findTexture(blockId, colorId);
      if (!existing) return;
      if (!confirm("Usunąć teksturę dla tej komórki?")) return;
      const key = `${blockId}-${colorId}`;
      setBusyKey(key);
      try {
        const token = await getToken();
        await deleteEntity("fenceBlockTextures", existing.id, token);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd usuwania");
      } finally {
        setBusyKey(null);
      }
    }

    if (blockIds.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Dodaj sloty w układzie paneli, aby skonfigurować macierz kolorów.
        </p>
      );
    }

    return (
      <div className="space-y-4">
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
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-[#f9fafb]">
                  <th className="sticky left-0 z-10 bg-[#f9fafb] px-3 py-2 text-left">
                    Panel
                  </th>
                  {colors.map((color) => (
                    <th
                      key={color.id}
                      className="min-w-[140px] px-2 py-2 text-center"
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
                {blocks.map((block) => (
                  <tr key={block.id} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-3 py-3 font-medium">
                      {block.name}
                      <span className="text-muted-foreground block text-xs">
                        {block.heightCm} cm
                      </span>
                    </td>
                    {colors.map((color) => {
                      const texture = findTexture(block.id, color.id);
                      const key = cellKey(block.id, color.id);
                      const isBusy = busyKey === `${block.id}-${color.id}`;
                      return (
                        <td key={color.id} className="px-2 py-2 align-top">
                          <div className="flex flex-col items-center gap-2">
                            {!pricesOnly && (
                              <AssetUploader
                                value={texture?.imageUrl}
                                storagePath={catalogAssetPath(
                                  "fenceBlocks",
                                  block.id,
                                  "colors",
                                  color.id,
                                )}
                                disabled={!canManage || isBusy}
                                onChange={(url) =>
                                  saveTexture(block.id, color.id, {
                                    imageUrl: url,
                                    priceNetPerUnit:
                                      draftPrices[key] ??
                                      texture?.priceNetPerUnit ??
                                      0,
                                  })
                                }
                              />
                            )}
                            <DecimalInput
                              value={draftPrices[key] ?? 0}
                              onChange={(v) =>
                                pricesOnly
                                  ? updateDraftPrice(block.id, color.id, v)
                                  : saveTexture(block.id, color.id, {
                                      imageUrl: texture?.imageUrl ?? "",
                                      priceNetPerUnit: v,
                                    })
                              }
                              min={0}
                              suffix="PLN/płyta"
                              variant="light"
                              className="w-full text-xs"
                            />
                            {texture && !pricesOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={!canManage || isBusy}
                                onClick={() =>
                                  removeTexture(block.id, color.id)
                                }
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
  },
);
