"use client";

import { BrandLogo } from "@/components/BrandLogo";

export function ConfiguratorHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[#e8e8e8] bg-white px-5 lg:px-8">
      <BrandLogo height={32} />
    </header>
  );
}
