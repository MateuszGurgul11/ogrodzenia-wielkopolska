import type { FenceStackSlot, FenceStackVersion, FenceVariant } from "@/lib/types";
import { ensureSlotUids } from "@/lib/fence/slotUid";

const VERSION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** mirrorsMain = tylko panele główne (bez osobnego slotu once). */
function collapseMirrorsMainStack(stack: FenceStackSlot[]): FenceStackSlot[] {
  const top = stack.find((s) => s.mode === "once");
  const main = stack.find((s) => s.mode === "repeat");
  if (!top?.mirrorsMain) return stack;
  return main ? [main] : stack.filter((s) => s.mode !== "once");
}

export function createStackVersionId(): string {
  return `sv-${crypto.randomUUID().slice(0, 8)}`;
}

export function defaultStackVersionName(index: number): string {
  const letter = VERSION_LETTERS[index] ?? String(index + 1);
  return `Wersja ${letter}`;
}

export function createDefaultStackVersion(
  index: number,
  source?: FenceStackVersion,
): FenceStackVersion {
  return {
    id: createStackVersionId(),
    name: defaultStackVersionName(index),
    stack: source?.stack?.length
      ? ensureSlotUids(source.stack.map((s) => ({ ...s })))
      : [],
    azurowoscEnabled: source?.azurowoscEnabled ?? false,
    azurowoscOptions: source?.azurowoscOptions
      ? JSON.parse(JSON.stringify(source.azurowoscOptions))
      : [],
    azurowoscColorId: source?.azurowoscColorId ?? null,
    postHeightCm: source?.postHeightCm ?? null,
    postHeightOffsetCm: source?.postHeightOffsetCm ?? null,
    sortOrder: index,
  };
}

/** Migracja read-time: stary wariant bez stackVersions → jedna „Wersja A”. */
export function getStackVersions(variant: FenceVariant): FenceStackVersion[] {
  if (variant.stackVersions?.length) {
    return [...variant.stackVersions].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return [
    {
      id: `${variant.id}-v-a`,
      name: "Wersja A",
      stack: variant.stack,
      azurowoscEnabled: variant.azurowoscEnabled,
      azurowoscOptions: variant.azurowoscOptions ?? [],
      azurowoscColorId: variant.azurowoscColorId ?? null,
      postHeightCm: variant.postHeightCm ?? null,
      postHeightOffsetCm: variant.postHeightOffsetCm ?? null,
      sortOrder: 0,
    },
  ];
}

export function normalizeFenceVariant(variant: FenceVariant): FenceVariant {
  const versions = getStackVersions(variant).map((v, i) => ({
    ...v,
    stack: ensureSlotUids(collapseMirrorsMainStack(v.stack)),
    sortOrder: i,
  }));
  return mirrorLegacyFromFirstVersion({
    ...variant,
    stackVersions: versions,
  });
}

export function mirrorLegacyFromFirstVersion(
  variant: FenceVariant,
): FenceVariant {
  const versions = getStackVersions(variant);
  const first = versions[0];
  if (!first) return variant;
  return {
    ...variant,
    stackVersions: versions,
    stack: first.stack,
    azurowoscEnabled: first.azurowoscEnabled,
    azurowoscOptions: first.azurowoscOptions ?? [],
    azurowoscColorId: first.azurowoscColorId ?? null,
    postHeightCm: first.postHeightCm ?? null,
    postHeightOffsetCm: first.postHeightOffsetCm ?? null,
  };
}

export function resolveStackVersion(
  variant: FenceVariant,
  versionId: string | null | undefined,
): FenceStackVersion {
  const versions = getStackVersions(variant);
  if (versionId) {
    const found = versions.find((v) => v.id === versionId);
    if (found) return found;
  }
  return versions[0];
}

/** Wariant z polami stack/ażur z wybranej wersji (dla designerów). */
export function applyStackVersionToVariant(
  variant: FenceVariant,
  version: FenceStackVersion,
): FenceVariant {
  return {
    ...variant,
    stack: version.stack,
    azurowoscEnabled: version.azurowoscEnabled,
    azurowoscOptions: version.azurowoscOptions ?? [],
    azurowoscColorId: version.azurowoscColorId ?? null,
    azurowoscLayout: null,
    postHeightCm: version.postHeightCm ?? null,
    postHeightOffsetCm: version.postHeightOffsetCm ?? null,
  };
}

export function patchStackVersion(
  variant: FenceVariant,
  versionId: string,
  patch: Partial<FenceStackVersion>,
): FenceVariant {
  const versions = getStackVersions(variant).map((v) =>
    v.id === versionId ? { ...v, ...patch } : v,
  );
  return mirrorLegacyFromFirstVersion({ ...variant, stackVersions: versions });
}
