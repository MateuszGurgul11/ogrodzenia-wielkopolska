"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { postSchema } from "@/lib/validations";
import type { Post } from "@/lib/types";

const emptyItem = {
  name: "",
  slug: "",
  previewAsset: "",
  widthCm: 20,
  sortOrder: 0,
  active: true,
};

export default function AdminPostsPage() {
  return (
    <EntityManager<Post>
      collection="posts"
      title="Słupki"
      schema={postSchema}
      emptyItem={emptyItem}
      fields={[
        { name: "name", label: "Nazwa", type: "text" },
        { name: "slug", label: "Slug", type: "text" },
        { name: "widthCm", label: "Szerokość (cm)", type: "number" },
        { name: "sortOrder", label: "Kolejność", type: "number" },
        { name: "previewAsset", label: "URL podglądu (opcjonalnie)", type: "text" },
        { name: "active", label: "Aktywny", type: "boolean" },
      ]}
    />
  );
}
