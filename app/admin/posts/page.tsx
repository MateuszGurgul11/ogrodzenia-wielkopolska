"use client";

import Link from "next/link";
import { EntityManager } from "@/components/admin/EntityManager";
import { postSchema } from "@/lib/validations";
import type { Post } from "@/lib/types";
import { catalogAssetPath } from "@/lib/firebase/storage";

const emptyItem = {
  name: "",
  slug: "",
  previewAsset: "",
  baseTextureUrl: "",
  widthCm: 20,
  priceSurchargePerMeter: 0,
  sortOrder: 0,
  active: true,
};

export default function AdminPostsPage() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Tekstury słupka per kolor ustaw w{" "}
        <Link href="/admin/textures" className="text-primary underline">
          macierzy tekstur
        </Link>{" "}
        (zakładka Słupki × kolory). Poniżej opcjonalne bazowe zdjęcie słupka.
      </p>
      <EntityManager<Post>
        collection="posts"
        title="Słupki"
        schema={postSchema}
        emptyItem={emptyItem}
        fields={[
          { name: "name", label: "Nazwa", type: "text" },
          { name: "slug", label: "Slug", type: "text" },
          { name: "widthCm", label: "Szerokość (cm)", type: "number" },
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
            name: "baseTextureUrl",
            label: "Bazowe zdjęcie słupka",
            type: "image",
            storagePath: ({ editingId }) =>
              editingId
                ? catalogAssetPath("posts", editingId, "base")
                : null,
          },
          { name: "sortOrder", label: "Kolejność", type: "number" },
          { name: "active", label: "Aktywny", type: "boolean" },
        ]}
      />
    </div>
  );
}
