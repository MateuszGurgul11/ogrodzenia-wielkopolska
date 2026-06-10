"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { heightSchema } from "@/lib/validations";
import type { Height } from "@/lib/types";

const emptyItem = {
  label: "",
  valueM: 1.5,
  sortOrder: 0,
  active: true,
};

export default function AdminHeightsPage() {
  return (
    <EntityManager<Height>
      collection="heights"
      title="Wysokości płotu"
      schema={heightSchema}
      emptyItem={emptyItem}
      fields={[
        { name: "label", label: "Etykieta (np. 1,50 m)", type: "text" },
        { name: "valueM", label: "Wartość (m)", type: "number" },
        { name: "sortOrder", label: "Kolejność", type: "number" },
        { name: "active", label: "Aktywny", type: "boolean" },
      ]}
    />
  );
}
