import type { FenceAzurUnit, FenceStackVersion, FenceVariant } from "@/lib/types";
import { ensureSlotUids, stripSlotUids } from "@/lib/fence/slotUid";
import {
  getStackVersions,
  mirrorLegacyFromFirstVersion,
  normalizeFenceVariant,
} from "@/lib/fence/stackVersions";

function isValidAzurUnit(unit: FenceAzurUnit): boolean {
  if (unit.heightCm < 1) return false;
  if (unit.isGap) return true;
  return Boolean(unit.blockId);
}

function cleanAzurUnits(units: FenceAzurUnit[]): FenceAzurUnit[] {
  return units.filter(isValidAzurUnit);
}

function cleanAzurowoscOptions(
  options: NonNullable<FenceStackVersion["azurowoscOptions"]>,
) {
  return options
    .filter((o) => o.gapCm >= 1)
    .map((o) => ({
      gapCm: o.gapCm,
      layouts: (o.layouts ?? [])
        .map((layout) => ({
          heightM: layout.heightM,
          units: cleanAzurUnits(layout.units),
        }))
        .filter((layout) => layout.units.length > 0),
    }));
}

function cleanStackVersion(version: FenceStackVersion): FenceStackVersion {
  const next: FenceStackVersion = {
    ...version,
    stack: stripSlotUids(ensureSlotUids(version.stack)),
    azurowoscEnabled: Boolean(version.azurowoscEnabled),
    azurowoscOptions: Array.isArray(version.azurowoscOptions)
      ? cleanAzurowoscOptions(version.azurowoscOptions)
      : [],
  };

  if (!next.azurowoscEnabled) {
    next.azurowoscOptions = [];
  }

  if (
    next.postHeightCm == null ||
    Number.isNaN(next.postHeightCm) ||
    next.postHeightCm < 50 ||
    next.postHeightCm > 300
  ) {
    next.postHeightCm = null;
  }

  if (
    next.postHeightOffsetCm == null ||
    Number.isNaN(next.postHeightOffsetCm) ||
    next.postHeightOffsetCm < -150 ||
    next.postHeightOffsetCm > 150
  ) {
    next.postHeightOffsetCm = null;
  }

  return next;
}

// Backend zapisuje przez merge — pole trzeba jawnie wysłać jako null,
// żeby wyczyścić starą wartość (pominięcie pola zostawia ją w bazie).
function dropInvalidOptionalNumbers(next: FenceVariant): void {
  // postHeightCm/postHeightOffsetCm żyją teraz per FenceStackVersion (cleanStackVersion);
  // zerujemy przestarzałe pola na wariancie, żeby nie zostawić martwych wartości w bazie.
  next.postHeightCm = null;
  next.postHeightOffsetCm = null;

  if (
    next.azurowoscDesignHeightM == null ||
    Number.isNaN(next.azurowoscDesignHeightM) ||
    next.azurowoscDesignHeightM < 1 ||
    next.azurowoscDesignHeightM > 2.25
  ) {
    next.azurowoscDesignHeightM = null;
  }

  if (next.sectionWidthCm == null || Number.isNaN(next.sectionWidthCm)) {
    next.sectionWidthCm = 200;
  } else {
    next.sectionWidthCm = Math.min(400, Math.max(50, next.sectionWidthCm));
  }

  if (next.azurowoscPresetId === "") {
    next.azurowoscPresetId = null;
  }
}

/** Przygotowuje wariant do walidacji i zapisu w API. */
export function sanitizeVariantForApi(variant: FenceVariant): FenceVariant {
  const normalized = normalizeFenceVariant(variant);
  const versions = getStackVersions(normalized).map(cleanStackVersion);

  const next = mirrorLegacyFromFirstVersion({
    ...normalized,
    stackVersions: versions,
    stack: stripSlotUids(ensureSlotUids(normalized.stack)),
  });

  next.azurowoscEnabled = Boolean(next.azurowoscEnabled);

  dropInvalidOptionalNumbers(next);

  if (!next.azurowoscEnabled) {
    next.azurowoscLayout = null;
  }

  next.azurowoscOptions = Array.isArray(next.azurowoscOptions)
    ? cleanAzurowoscOptions(next.azurowoscOptions)
    : [];

  if (next.azurowoscOptions.length > 0) {
    next.azurowoscLayout = null;
  } else if (next.azurowoscLayout?.length) {
    const cleaned = cleanAzurUnits(next.azurowoscLayout);
    next.azurowoscLayout = cleaned.length > 0 ? cleaned : null;
  }

  if (next.azurowoscLayout === undefined) {
    next.azurowoscLayout = null;
  }

  return next;
}

export function formatVariantValidationError(
  message: string,
  path: ReadonlyArray<string | number> = [],
): string {
  const pathKey = path.join(".");
  if (
    pathKey.includes("azurowosc") ||
    pathKey.includes("heightCm") ||
    (message.includes("Too small") && pathKey.includes("Azur"))
  ) {
    return `Nieprawidłowe dane ażurowości (${pathKey}: ${message}) — otwórz „Ustaw ażurowość” i zapisz ponownie.`;
  }
  return pathKey ? `${message} (${pathKey})` : message;
}
