"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { elementSchema } from "@/lib/validations";
import type { OpeningElement } from "@/lib/types";
import { catalogAssetPath } from "@/lib/firebase/storage";
import {
  DEFAULT_FURTKA_PRICE_NET,
} from "@/lib/pricing/element-prices";

const emptyItem = {
  type: "furtka" as const,
  name: "",
  description: "",
  textureUrl: "",
  priceNet: DEFAULT_FURTKA_PRICE_NET,
  sortOrder: 0,
  active: true,
};

export default function AdminElementsPage() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Brama i furtka — wygląd, tekstura oraz cena. Brama: stawka za panel lub
        odcinek na rzucie. Furtka: cena jednorazowa za sztukę.
      </p>
      <EntityManager<OpeningElement>
        collection="elements"
        title="Elementy"
        schema={elementSchema}
        emptyItem={emptyItem}
        fields={[
          {
            name: "type",
            label: "Typ",
            type: "select",
            options: [
              { value: "brama", label: "Brama wjazdowa" },
              { value: "furtka", label: "Furtka" },
            ],
          },
          { name: "name", label: "Nazwa", type: "text" },
          {
            name: "priceNet",
            label: "Cena (PLN netto)",
            type: "number",
          },
          { name: "active", label: "Aktywny", type: "boolean" },
          { name: "sortOrder", label: "Kolejność", type: "number" },
          {
            name: "textureUrl",
            label: "Zdjęcie tekstury",
            type: "image",
            storagePath: ({ form, editingId }) => {
              if (!editingId) return null;
              const type = String(form.type ?? "furtka");
              return catalogAssetPath("elements", type, editingId);
            },
          },
        ]}
      />
    </div>
  );
}
