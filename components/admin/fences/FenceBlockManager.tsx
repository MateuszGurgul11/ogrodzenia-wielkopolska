"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { CustomSvgDesignDialog } from "@/components/admin/fences/CustomSvgDesignDialog";
import { FenceBlockForm } from "@/components/admin/fences/FenceBlockForm";
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
  deleteEntity,
  fetchAllForAdmin,
  isApiConfigured,
} from "@/lib/api/client";
import type { FenceBlock } from "@/lib/types";

function PanelSection({
  title,
  description,
  panels,
  addLabel,
  customSvgLabel,
  canManage,
  deletingId,
  onAdd,
  onAddCustomSvg,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  panels: FenceBlock[];
  addLabel: string;
  customSvgLabel: string;
  canManage: boolean;
  deletingId: string | null;
  onAdd: () => void;
  onAddCustomSvg: () => void;
  onEdit: (block: FenceBlock) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!canManage} onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            {addLabel}
          </Button>
          <Button variant="outline" size="sm" disabled={!canManage} onClick={onAddCustomSvg}>
            <Plus className="mr-1 h-4 w-4" />
            {customSvgLabel}
          </Button>
        </div>
      </div>

      {panels.length === 0 ? (
        <p className="text-muted-foreground text-sm">Brak paneli w tej kategorii.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((block) => (
            <Card key={block.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{block.name}</CardTitle>
                    <CardDescription>{block.heightCm} cm</CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!canManage}
                      onClick={() => onEdit(block)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!canManage || deletingId === block.id}
                      onClick={() => onDelete(block.id, block.name)}
                    >
                      {deletingId === block.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="text-destructive h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-wrap items-center gap-2">
                {block.active ? (
                  <Badge>Aktywny</Badge>
                ) : (
                  <Badge variant="secondary">Wyłączony</Badge>
                )}
                {block.svgMarkup && (
                  <Badge variant="outline" className="border-[#6366f1] text-[#6366f1]">
                    Własny SVG
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function FenceBlockManager() {
  const { user, getToken } = useAdminAuth();
  const [blocks, setBlocks] = useState<FenceBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [svgDialogOpen, setSvgDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FenceBlock | null>(null);
  const [svgEditingBlock, setSvgEditingBlock] = useState<FenceBlock | null>(null);
  const [createRole, setCreateRole] = useState<"standard" | "cap">("standard");
  const [error, setError] = useState<string | null>(null);
  const canManage = isApiConfigured() && Boolean(user);

  const mainPanels = useMemo(
    () => blocks.filter((b) => b.role === "standard"),
    [blocks],
  );
  const capPanels = useMemo(
    () => blocks.filter((b) => b.role === "cap"),
    [blocks],
  );

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const list = await fetchAllForAdmin<FenceBlock>("fenceBlocks", token);
      setBlocks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania paneli");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate(role: "standard" | "cap") {
    setEditingBlock(null);
    setSvgEditingBlock(null);
    setCreateRole(role);
    setFormOpen(true);
  }

  function openCustomSvg(role: "standard" | "cap", block: FenceBlock | null = null) {
    setEditingBlock(null);
    setFormOpen(false);
    setSvgEditingBlock(block);
    setCreateRole(role);
    setSvgDialogOpen(true);
  }

  function openEdit(block: FenceBlock) {
    if (block.svgMarkup) {
      openCustomSvg(block.role, block);
      return;
    }
    setSvgEditingBlock(null);
    setEditingBlock(block);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingBlock(null);
  }

  function handleSvgDialogOpenChange(open: boolean) {
    setSvgDialogOpen(open);
    if (!open) setSvgEditingBlock(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!canManage) return;
    if (!confirm(`Usunąć panel „${name}"?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const token = await getToken();
      await deleteEntity("fenceBlocks", id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Panele</h2>
        <p className="text-muted-foreground text-sm">
          Fizyczne panele używane w układach wariantów ogrodzeń.
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
        <div className="space-y-8">
          <PanelSection
            title="Panel główny"
            description="Powtarzalne panele wypełniające wysokość ogrodzenia."
            panels={mainPanels}
            addLabel="Nowy panel główny"
            customSvgLabel="Własny design SVG"
            canManage={canManage}
            deletingId={deletingId}
            onAdd={() => openCreate("standard")}
            onAddCustomSvg={() => openCustomSvg("standard")}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
          <PanelSection
            title="Panel górny"
            description="Panel zamykający stos — montowany raz na górze."
            panels={capPanels}
            addLabel="Nowy panel górny"
            customSvgLabel="Własny design SVG"
            canManage={canManage}
            deletingId={deletingId}
            onAdd={() => openCreate("cap")}
            onAddCustomSvg={() => openCustomSvg("cap")}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <FenceBlockForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        editingBlock={editingBlock}
        initialRole={createRole}
        sortOrder={blocks.length}
        onSaved={() => load()}
        onRequestCustomSvg={(role) => openCustomSvg(role)}
      />

      <CustomSvgDesignDialog
        open={svgDialogOpen}
        onOpenChange={handleSvgDialogOpenChange}
        initialRole={createRole}
        sortOrder={blocks.length}
        editingBlock={svgEditingBlock}
        onSaved={() => load()}
      />
    </section>
  );
}
