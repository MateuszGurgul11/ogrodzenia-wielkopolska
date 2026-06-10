"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { spacerSchema } from "@/lib/validations";
import type { SpacerOption } from "@/lib/types";

const emptyItem = {
  name: "",
  hasSpacer: false,
  openness: 0,
  sortOrder: 0,
  active: true,
};

export default function AdminSpacersPage() {
  return (
    <EntityManager<SpacerOption>
      collection="spacerOptions"
      title="Dystanse / ażurowość"
      schema={spacerSchema}
      emptyItem={emptyItem}
      fields={[
        { name: "name", label: "Nazwa", type: "text" },
        { name: "hasSpacer", label: "Z dystansem", type: "boolean" },
        { name: "openness", label: "Ażurowość (0–1)", type: "number" },
        { name: "sortOrder", label: "Kolejność", type: "number" },
        { name: "active", label: "Aktywny", type: "boolean" },
      ]}
    />
  );
}
