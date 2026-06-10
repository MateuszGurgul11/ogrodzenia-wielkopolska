import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SITE_URL = "https://ogrodzenia-wielkopolska.pl/";

type BrandLogoProps = {
  className?: string;
  height?: number;
};

export function BrandLogo({ className, height = 36 }: BrandLogoProps) {
  const width = Math.round(height * (1807 / 480));

  return (
    <Link
      href={SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="Ogrodzenia Wielkopolska — strona główna"
    >
      <Image
        src="/logo.png"
        alt="Ogrodzenia Wielkopolska"
        width={width}
        height={height}
        unoptimized
        className="block h-auto w-auto bg-transparent"
        style={{ height, width: "auto", maxWidth: width }}
        priority
      />
    </Link>
  );
}
