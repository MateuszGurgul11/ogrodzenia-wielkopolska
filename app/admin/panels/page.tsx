"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { panelSchema } from "@/lib/validations";
import type { Panel } from "@/lib/types";
import { catalogAssetPath } from "@/lib/firebase/storage";
import Link from "next/link";

const emptyItem = {
  name: "",
  patternId: "pattern-solid",
  priceSurchargePerMeter: 0,
  previewAsset: "",
  baseTextureUrl: "",
  textureTileHeightM: 0.45,
  sortOrder: 0,
  active: true,
};

export default function AdminPanelsPage() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Bazowe zdjęcie panelu i wysokość kafelka. Tekstury per kolor ustawiasz w{" "}
        <Link href="/admin/textures" className="text-primary underline">
          macierzy tekstur
        </Link>
        . Gdy brak zdjęć, podgląd używa wzoru SVG (fallback).
      </p>
      <EntityManager<Panel>
        collection="panels"
        title="Panele"
        schema={panelSchema}
        emptyItem={emptyItem}
        fields={[
          { name: "name", label: "Nazwa", type: "text" },
          {
            name: "priceSurchargePerPanel",
            label: "Dopłata za panel (PLN)",
            type: "number",
          },
          {
            name: "priceSurchargePerMeter",
            label: "Dopłata za m bieżący (PLN, fallback)",
            type: "number",
          },
          {
            name: "textureTileHeightM",
            label: "Wysokość kafelka tekstury (m)",
            type: "number",
          },
          {
            name: "baseTextureUrl",
            label: "Bazowe zdjęcie panelu",
            type: "image",
            storagePath: ({ editingId }) =>
              editingId
                ? catalogAssetPath("panels", editingId, "base")
                : null,
          },
          { name: "sortOrder", label: "Kolejność", type: "number" },
          { name: "active", label: "Aktywny", type: "boolean" },
        ]}
      />
    </div>
  );
}
