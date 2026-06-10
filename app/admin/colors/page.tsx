"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { colorSchema } from "@/lib/validations";
import type { Color } from "@/lib/types";

const emptyItem = {
  name: "",
  hex: "#9ca3af",
  sortOrder: 0,
  active: true,
};

export default function AdminColorsPage() {
  return (
    <EntityManager<Color>
      collection="colors"
      title="Kolory"
      schema={colorSchema}
      emptyItem={emptyItem}
      fields={[
        { name: "name", label: "Nazwa", type: "text" },
        { name: "hex", label: "Kolor", type: "color" },
        { name: "sortOrder", label: "Kolejność", type: "number" },
        { name: "active", label: "Aktywny", type: "boolean" },
      ]}
    />
  );
}
