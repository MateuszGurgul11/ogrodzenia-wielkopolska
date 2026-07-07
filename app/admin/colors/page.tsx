"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { colorSchema } from "@/lib/validations";
import type { Color } from "@/lib/types";

const emptyItem = {
  name: "",
  hex: "#9ca3af",
  priceSurchargePerMeter: 0,
  sortOrder: 0,
  active: true,
};

export default function AdminColorsPage() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Kolory definiują kolumny w macierzy tekstur (panel × kolor i słupek ×
        kolor). Zdjęcia wgrywasz w sekcji Tekstury — tutaj ustawiasz tylko nazwę
        i kod koloru.
      </p>
      <EntityManager<Color>
      collection="colors"
      title="Kolory"
      schema={colorSchema}
      emptyItem={emptyItem}
      fields={[
        { name: "name", label: "Nazwa", type: "text" },
        { name: "hex", label: "Kolor", type: "color" },
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
        { name: "sortOrder", label: "Kolejność", type: "number" },
        { name: "active", label: "Aktywny", type: "boolean" },
      ]}
      />
    </div>
  );
}
