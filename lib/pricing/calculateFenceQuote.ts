import type {
  CatalogCollections,
  ConfiguratorSelection,
  FenceVariant,
  QuoteBreakdown,
  QuoteConfigurationItem,
  QuoteResult,
} from "@/lib/types";
import { MIN_PREVIEW_PANELS } from "@/lib/configurator/state";
import {
  getDrivewayGateSpanM,
  getWicketWidthCm,
} from "@/lib/pricing/variant-prices";
import { resolveElement, resolveElementPriceNet } from "@/lib/pricing/element-prices";
import {
  countPanelsInLayout,
  resolveBlockUnitPrice,
  resolvePostUnitPrice,
  resolveStackVersion,
  resolveVariantUnits,
  versionSupportsAzurowosc,
} from "@/lib/fence/resolveStack";

type FenceQuoteInput = {
  catalog: CatalogCollections;
  selection: ConfiguratorSelection;
  variant: FenceVariant;
  heightM: number;
  perimeterM?: number | null;
  azurowoscEnabled: boolean;
  bramaEnabled?: boolean;
  bramaElementId?: string | null;
  bramaOccupiedSpanM?: number | null;
  furtkaEnabled?: boolean;
  furtkaElementId?: string | null;
  furtkaPositionLabel?: string;
  fallbackPanelCount?: number;
  currency?: string;
};

function estimatePerimeterFromSections(
  sectionCount: number,
  sectionWidthCm: number,
): number {
  return sectionCount * (sectionWidthCm / 100);
}

export function calculateStackUnitPrice(
  catalog: CatalogCollections,
  variant: FenceVariant,
  heightM: number,
  colorId: string | null,
  azurowoscEnabled: boolean,
  heightMultiplier = 1,
  azurowoscGapCm: number | null = null,
  stackVersionId: string | null = null,
): number {
  const units = resolveVariantUnits({
    variant,
    stackVersionId,
    blocks: catalog.fenceBlocks,
    heightM,
    azurowoscEnabled,
    azurowoscGapCm,
  });

  const raw = units
    .filter((unit) => !unit.isGap && unit.blockId)
    .reduce(
      (sum, unit) =>
        sum + resolveBlockUnitPrice(catalog, unit.blockId!, colorId),
      0,
    );
  return raw * heightMultiplier;
}

export function calculateFenceQuote(input: FenceQuoteInput): QuoteResult {
  const {
    catalog,
    selection,
    variant,
    heightM,
    azurowoscEnabled,
  } = input;

  const height = catalog.heights.find((h) => h.id === selection.heightId);
  const color = catalog.colors.find((c) => c.id === selection.colorId);
  const post = catalog.posts.find((p) => p.id === variant.postId);
  const heightMultiplier = height?.priceMultiplier ?? 1;
  const sectionWidthCm = variant.sectionWidthCm;
  const sectionWidthM = sectionWidthCm / 100;

  const sectionCount =
    input.perimeterM && input.perimeterM > 0
      ? Math.max(
          MIN_PREVIEW_PANELS,
          Math.ceil(input.perimeterM / sectionWidthM),
        )
      : (input.fallbackPanelCount ?? MIN_PREVIEW_PANELS);

  const perimeterM =
    input.perimeterM && input.perimeterM > 0
      ? input.perimeterM
      : estimatePerimeterFromSections(sectionCount, sectionWidthCm);

  const stackUnitPrice = calculateStackUnitPrice(
    catalog,
    variant,
    heightM,
    selection.colorId,
    azurowoscEnabled,
    heightMultiplier,
    selection.azurowoscGapCm,
    selection.stackVersionId,
  );

  const postUnitPrice =
    resolvePostUnitPrice(catalog, variant.postId, selection.colorId) *
    heightMultiplier;

  const bramaEnabled = Boolean(input.bramaElementId);
  const furtkaEnabled = input.furtkaEnabled ?? Boolean(input.furtkaElementId);
  const bramaElement = bramaEnabled
    ? resolveElement(catalog, "brama", input.bramaElementId)
    : undefined;
  const furtkaElement = furtkaEnabled
    ? resolveElement(catalog, "furtka", input.furtkaElementId)
    : undefined;

  const bramaSpanRawM = bramaEnabled
    ? input.bramaOccupiedSpanM != null && input.bramaOccupiedSpanM > 0
      ? Math.max(0, input.bramaOccupiedSpanM)
      : getDrivewayGateSpanM(sectionWidthCm)
    : null;
  const bramaSections =
    bramaEnabled && bramaSpanRawM != null && bramaSpanRawM > 0
      ? Math.max(1, Math.ceil(bramaSpanRawM / sectionWidthM))
      : 0;
  const bramaSpanUsedM = bramaSections * sectionWidthM;
  const furtkaSpanUsedM = furtkaEnabled
    ? getWicketWidthCm(sectionWidthCm) / 100
    : 0;
  const openingSpanM = bramaSpanUsedM + furtkaSpanUsedM;

  const panelUnits = Math.max(
    MIN_PREVIEW_PANELS,
    Math.ceil((perimeterM - openingSpanM) / sectionWidthM),
  );
  const postCount = panelUnits + 1;

  const fenceSubtotal = panelUnits * stackUnitPrice;
  const postsSubtotal = postCount * postUnitPrice;

  const bramaUnitPrice = resolveElementPriceNet(
    catalog,
    "brama",
    input.bramaElementId ?? bramaElement?.id,
  );
  const furtkaUnitPrice = resolveElementPriceNet(
    catalog,
    "furtka",
    input.furtkaElementId ?? furtkaElement?.id,
  );
  const bramaPrice = bramaEnabled ? bramaUnitPrice : 0;
  const furtkaPrice = furtkaEnabled ? furtkaUnitPrice : 0;
  const totalNet = fenceSubtotal + postsSubtotal + bramaPrice + furtkaPrice;

  const configurationItems: QuoteConfigurationItem[] = [
    { label: "Wariant", value: variant.name },
    {
      label: "Wersja",
      value: resolveStackVersion(variant, selection.stackVersionId).name,
    },
    { label: "Kolor", value: color?.name ?? "—" },
    { label: "Wysokość", value: height?.label ?? "—" },
    { label: "Słupek", value: post?.name ?? "—" },
    {
      label: "Ażurowość",
      value:
        azurowoscEnabled &&
        versionSupportsAzurowosc(
          resolveStackVersion(variant, selection.stackVersionId),
        )
          ? `${selection.azurowoscGapCm != null ? `${selection.azurowoscGapCm} cm · ` : ""}${countPanelsInLayout(
              resolveVariantUnits({
                variant,
                stackVersionId: selection.stackVersionId,
                blocks: catalog.fenceBlocks,
                heightM,
                azurowoscEnabled: true,
                azurowoscGapCm: selection.azurowoscGapCm,
              }),
            )} paneli`
          : "Nie",
    },
    {
      label: "Brama wjazdowa",
      value: bramaEnabled
        ? `${bramaElement?.name ?? "Brama"} · ${bramaSpanUsedM.toFixed(1)} m`
        : "Nie",
    },
    {
      label: "Furtka",
      value: furtkaEnabled
        ? `${furtkaElement?.name ?? "Furtka"}${input.furtkaPositionLabel ? ` · ${input.furtkaPositionLabel}` : ""}`
        : "Nie",
    },
  ];

  const breakdown: QuoteBreakdown[] = [
    {
      label: `Odcinek · ${variant.name}`,
      value: `${stackUnitPrice.toLocaleString("pl-PL")} PLN/odcinek`,
      amount: fenceSubtotal,
    },
    {
      label: `Słupki · ${post?.name ?? "—"}`,
      value: `${postUnitPrice.toLocaleString("pl-PL")} PLN/szt. × ${postCount}`,
      amount: postsSubtotal,
    },
    {
      label: "Ogrodzenie",
      value: `${panelUnits} odcinków × ${stackUnitPrice.toLocaleString("pl-PL")} PLN`,
      amount: fenceSubtotal,
    },
  ];

  if (height && heightMultiplier !== 1) {
    breakdown.unshift({
      label: `Wysokość · ${height.label}`,
      value: `mnożnik × ${heightMultiplier.toFixed(2)}`,
      amount: 0,
    });
  }

  if (bramaEnabled) {
    breakdown.push({
      label: bramaElement?.name
        ? `Brama · ${bramaElement.name}`
        : "Brama wjazdowa",
      value: `${bramaUnitPrice.toLocaleString("pl-PL")} PLN netto`,
      amount: bramaPrice,
    });
  }

  if (furtkaEnabled) {
    breakdown.push({
      label: furtkaElement?.name ? `Furtka · ${furtkaElement.name}` : "Furtka",
      value: "jednorazowo",
      amount: furtkaPrice,
    });
  }

  return {
    perimeterM,
    estimatedPanels: panelUnits,
    panelUnits,
    pricePerPanelNet: stackUnitPrice,
    pricePerMeterNet: stackUnitPrice / sectionWidthM,
    fenceSubtotal,
    postsSubtotal,
    bramaPrice,
    furtkaPrice,
    totalNet,
    currency: input.currency ?? "PLN",
    breakdown,
    configurationItems,
    hasMeasuredPerimeter: Boolean(input.perimeterM && input.perimeterM > 0),
  };
}
