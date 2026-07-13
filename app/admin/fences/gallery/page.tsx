import Link from "next/link";
import { FencePanelGallery } from "@/components/admin/fences/FencePanelGallery";

export default function FenceGalleryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2">
            <Link
              href="/admin/fences"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af] hover:text-[#ff3131]"
            >
              ← Ogrodzenia
            </Link>
          </p>
          <h1 className="font-heading text-2xl font-semibold">Galeria paneli</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Podglądy wszystkich paneli — proceduralnych i własnych SVG. Możesz
            wkleić kod lub wgrać plik .svg; panel trafi do bazy jako panel główny
            lub górny i będzie widoczny w konfiguratorze.
          </p>
        </div>
      </div>

      <FencePanelGallery />
    </div>
  );
}
