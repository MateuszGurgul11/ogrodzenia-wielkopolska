"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { panelSchema } from "@/lib/validations";
import type { Panel } from "@/lib/types";

const emptyItem = {
  name: "",
  patternId: "pattern-solid",
  previewAsset: "",
  sortOrder: 0,
  active: true,
};

export default function AdminPanelsPage() {
  return (
    <EntityManager<Panel>
      collection="panels"
      title="Panele"
      schema={panelSchema}
      emptyItem={emptyItem}
      fields={[
        { name: "name", label: "Nazwa", type: "text" },
        { name: "patternId", label: "Wzór", type: "select" },
        { name: "sortOrder", label: "Kolejność", type: "number" },
        { name: "previewAsset", label: "URL podglądu (opcjonalnie)", type: "text" },
        { name: "active", label: "Aktywny", type: "boolean" },
      ]}
    />
  );
}
