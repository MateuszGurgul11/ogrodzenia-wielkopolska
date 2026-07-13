"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Trash2 } from "lucide-react";
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
import { updateEntity } from "@/lib/api/client";
import { getStackVersions } from "@/lib/fence/stackVersions";
import {
  formatVariantValidationError,
  sanitizeVariantForApi,
} from "@/lib/fence/sanitizeVariant";
import type { FenceVariant } from "@/lib/types";
import { fenceVariantSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Props = {
  variants: FenceVariant[];
  canManage: boolean;
  deletingId: string | null;
  onVariantsChange: (variants: FenceVariant[]) => void;
  onDelete: (id: string, name: string) => void;
  onError: (message: string | null) => void;
};

function SortableVariantCard({
  variant,
  canManage,
  deletingId,
  onDelete,
  reordering,
}: {
  variant: FenceVariant;
  canManage: boolean;
  deletingId: string | null;
  onDelete: (id: string, name: string) => void;
  reordering: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: variant.id,
    disabled: !canManage || reordering,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative h-full transition-shadow hover:shadow-md",
        isDragging && "z-10 opacity-90 shadow-lg ring-2 ring-primary/30",
      )}
    >
      {canManage && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={cn(
            "absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
            reordering
              ? "cursor-not-allowed opacity-40"
              : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing",
          )}
          aria-label={`Zmień kolejność: ${variant.name}`}
          disabled={reordering}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <Link href={`/admin/fences/${variant.id}`} className="block">
        <CardHeader className={canManage ? "pl-12" : undefined}>
          <div className="flex items-start justify-between gap-2 pr-8">
            <CardTitle className="text-lg">{variant.name}</CardTitle>
            {variant.active ? (
              <Badge>Aktywny</Badge>
            ) : (
              <Badge variant="secondary">Wyłączony</Badge>
            )}
          </div>
          <CardDescription>
            {getStackVersions(variant).length} wersji · {variant.stack.length}{" "}
            slotów ·{" "}
            {variant.azurowoscEnabled && variant.azurowoscOptions?.length
              ? `ażur: ${variant.azurowoscOptions
                  .map((o) => `${o.gapCm} cm`)
                  .join(", ")}`
              : "bez ażurowości"}
          </CardDescription>
        </CardHeader>
        <CardContent className={canManage ? "pl-12" : undefined}>
          <span className="text-primary text-sm font-medium">Edytuj →</span>
        </CardContent>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8"
        disabled={!canManage || deletingId === variant.id || reordering}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(variant.id, variant.name);
        }}
      >
        {deletingId === variant.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="text-destructive h-4 w-4" />
        )}
      </Button>
    </Card>
  );
}

async function persistVariantSortOrders(
  variants: FenceVariant[],
  previous: FenceVariant[],
  token: string,
) {
  const previousOrder = new Map(previous.map((v) => [v.id, v.sortOrder]));
  const changed = variants.filter(
    (v) => previousOrder.get(v.id) !== v.sortOrder,
  );

  await Promise.all(
    changed.map(async (variant) => {
      const forApi = sanitizeVariantForApi(variant);
      const parsed = fenceVariantSchema.safeParse(forApi);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new Error(
          formatVariantValidationError(
            issue?.message ?? "Nieprawidłowe dane wariantu",
            issue?.path.filter(
              (p): p is string | number =>
                typeof p === "string" || typeof p === "number",
            ) ?? [],
          ),
        );
      }
      await updateEntity("fenceVariants", variant.id, parsed.data, token);
    }),
  );
}

export function FenceVariantSortableGrid({
  variants,
  canManage,
  deletingId,
  onVariantsChange,
  onDelete,
  onError,
}: Props) {
  const { getToken } = useAdminAuth();
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const variantIds = useMemo(() => variants.map((v) => v.id), [variants]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !canManage) return;

    const oldIndex = variants.findIndex((v) => v.id === active.id);
    const newIndex = variants.findIndex((v) => v.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = variants;
    const reordered = arrayMove(variants, oldIndex, newIndex).map((v, i) => ({
      ...v,
      sortOrder: i,
    }));

    onVariantsChange(reordered);
    setReordering(true);
    onError(null);

    try {
      const token = await getToken();
      await persistVariantSortOrders(reordered, previous, token);
    } catch (e) {
      onVariantsChange(previous);
      onError(
        e instanceof Error ? e.message : "Nie udało się zapisać kolejności",
      );
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-3">
      {canManage && variants.length > 1 && (
        <p className="text-muted-foreground text-sm">
          Przeciągnij wariant za uchwyt{" "}
          <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" />, aby
          zmienić kolejność w konfiguratorze.
          {reordering && (
            <span className="text-foreground ml-2 inline-flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Zapisywanie…
            </span>
          )}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <SortableContext items={variantIds} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((variant) => (
              <SortableVariantCard
                key={variant.id}
                variant={variant}
                canManage={canManage}
                deletingId={deletingId}
                onDelete={onDelete}
                reordering={reordering}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
