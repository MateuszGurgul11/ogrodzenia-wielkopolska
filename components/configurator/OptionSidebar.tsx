"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CatalogCollections,
  ConfiguratorSelection,
  Color,
  FenceVariant,
  Height,
  Post,
} from "@/lib/types";
import {
  type ConfiguratorTab,
  type GatePosition,
  MAX_PREVIEW_PANELS,
  MIN_PREVIEW_PANELS,
  getNextConfiguratorTab,
  resolveQuotePerimeterM,
  useConfiguratorStore,
} from "@/lib/configurator/state";
import { calculateStackUnitPrice } from "@/lib/pricing/calculateFenceQuote";
import {
  getAzurGapOptions,
  resolveFenceVariant,
  resolveStackVersion,
  resolveVariantUnits,
  versionSupportsAzurowosc,
} from "@/lib/fence/resolveStack";
import { getStackVersions } from "@/lib/fence/stackVersions";
import { ConfiguratorTabs } from "./ConfiguratorTabs";
import { BackgroundPicker } from "./BackgroundPicker";
import { QuoteSidebarPanel } from "./QuoteSidebarPanel";
import { PdfDocument } from "./PdfDocument";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { generateConfiguratorPdf } from "@/lib/pdf/generateConfiguratorPdf";
import {
  formatElementPriceSubtitle,
  getElementsByType,
} from "@/lib/pricing/element-prices";

type Props = {
  catalog: CatalogCollections;
  selection: ConfiguratorSelection;
  activeTab: ConfiguratorTab;
  onSelect: (partial: Partial<ConfiguratorSelection>) => void;
  onTabChange: (tab: ConfiguratorTab) => void;
};

function countAzurPanels(
  catalog: CatalogCollections,
  variant: FenceVariant,
  heightM: number,
  gapCm: number | null,
  stackVersionId: string | null,
): number {
  const units = resolveVariantUnits({
    variant,
    stackVersionId,
    blocks: catalog.fenceBlocks,
    heightM,
    azurowoscEnabled: true,
    azurowoscGapCm: gapCm,
  });
  return units.filter((u) => !u.isGap && u.blockId).length;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-cfg-sidebar-muted">
      {children}
    </p>
  );
}

function ModelCard({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all",
        selected
          ? "border-[#ff3131] bg-[#2a1515]"
          : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface hover:border-cfg-sidebar-border hover:bg-cfg-sidebar-surface-hover",
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          selected
            ? "border-[#ff3131] bg-[#ff3131]"
            : "border-cfg-sidebar-border bg-transparent",
        )}
      >
        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold",
            selected ? "text-white" : "text-[#ccc]",
          )}
        >
          {title}
        </p>
        <p className="text-[11px] text-cfg-sidebar-muted">{subtitle}</p>
      </div>
    </button>
  );
}

function formatHeightMultiplier(value?: number): string {
  if (value == null || value === 1) return "×1,00";
  return `×${value.toFixed(2)}`;
}

function formatOpeningSummary(
  enabled: boolean,
  position: GatePosition,
  labels: Record<GatePosition, string>,
): string {
  return enabled ? `Tak · ${labels[position]}` : "Nie";
}

function OpeningPositionPicker({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: GatePosition;
  onChange: (position: GatePosition) => void;
  labels: Record<GatePosition, string>;
}) {
  return (
    <div className="mt-4">
      <SectionLabel>{label}</SectionLabel>
      <div className="grid grid-cols-1 gap-2">
        {(["left", "center", "right"] as GatePosition[]).map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all",
              value === pos
                ? "border-[#ff3131] bg-[#2a1515] text-white"
                : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface text-cfg-sidebar-subtle hover:border-cfg-sidebar-border",
            )}
          >
            {labels[pos]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OptionSidebar({
  catalog,
  selection,
  activeTab,
  onSelect,
  onTabChange,
}: Props) {
  const selectedHeight = catalog.heights.find(
    (h) => h.id === selection.heightId,
  );
  const selectedColor = catalog.colors.find((c) => c.id === selection.colorId);
  const selectedVariant = resolveFenceVariant(
    catalog,
    selection.fenceVariantId,
  );
  const stackVersions = useMemo(
    () => (selectedVariant ? getStackVersions(selectedVariant) : []),
    [selectedVariant],
  );
  const activeStackVersion = useMemo(() => {
    if (!selectedVariant) return null;
    return resolveStackVersion(selectedVariant, selection.stackVersionId);
  }, [selectedVariant, selection.stackVersionId]);
  const allowedHeights = useMemo(
    () =>
      selectedVariant && selectedVariant.heightIds.length > 0
        ? catalog.heights.filter((h) =>
            selectedVariant.heightIds.includes(h.id),
          )
        : catalog.heights,
    [catalog.heights, selectedVariant],
  );

  // Wysokość spoza dozwolonych dla wariantu — przełącz na pierwszą dozwoloną.
  useEffect(() => {
    if (allowedHeights.length === 0) return;
    if (!allowedHeights.some((h) => h.id === selection.heightId)) {
      onSelect({ heightId: allowedHeights[0].id });
    }
  }, [allowedHeights, selection.heightId, onSelect]);

  useEffect(() => {
    if (!selectedVariant || stackVersions.length === 0) return;
    if (!stackVersions.some((v) => v.id === selection.stackVersionId)) {
      onSelect({ stackVersionId: stackVersions[0].id });
    }
  }, [selectedVariant, stackVersions, selection.stackVersionId, onSelect]);
  const selectedPost = catalog.posts.find(
    (p) => p.id === selectedVariant?.postId,
  );
  const bramaEnabled = useConfiguratorStore((s) => s.bramaEnabled);
  const bramaElementId = useConfiguratorStore((s) => s.bramaElementId);
  const bramaOccupiedSpanM = useConfiguratorStore((s) => s.bramaOccupiedSpanM);
  const furtkaEnabled = useConfiguratorStore((s) => s.furtkaEnabled);
  const furtkaElementId = useConfiguratorStore((s) => s.furtkaElementId);
  const furtkaPosition = useConfiguratorStore((s) => s.furtkaPosition);
  const scope = useConfiguratorStore((s) => s.scope);
  const features = useConfiguratorStore((s) => s.features);
  const manualQuotePerimeterM = useConfiguratorStore((s) => s.manualQuotePerimeterM);
  const manualQuoteFrontLengthM = useConfiguratorStore(
    (s) => s.manualQuoteFrontLengthM,
  );
  const quoteFenceScope = useConfiguratorStore((s) => s.quoteFenceScope);
  const setBramaElementId = useConfiguratorStore((s) => s.setBramaElementId);
  const setFurtkaElementId = useConfiguratorStore((s) => s.setFurtkaElementId);
  const previewPanelCount = useConfiguratorStore((s) => s.previewPanelCount);
  const setPreviewPanelCount = useConfiguratorStore((s) => s.setPreviewPanelCount);
  const pricing = useConfiguratorStore((s) => s.pricing);
  const quotePerimeterM = useConfiguratorStore((s) => s.quotePerimeterM);
  const quoteFenceClosed = useConfiguratorStore((s) => s.quoteFenceClosed);

  const openingPositionLabels: Record<GatePosition, string> = {
    left: "Lewa sekcja",
    center: "Środkowa sekcja",
    right: "Prawa sekcja",
  };

  const bramaOptions = useMemo(
    () => getElementsByType(catalog, "brama"),
    [catalog],
  );
  const furtkaOptions = useMemo(
    () => getElementsByType(catalog, "furtka"),
    [catalog],
  );

  const quote = useMemo(() => {
    const effectivePerimeterM = resolveQuotePerimeterM({
      quoteFenceClosed,
      quotePerimeterM,
      quoteFenceScope,
      manualQuotePerimeterM,
      manualQuoteFrontLengthM,
    });
    return calculateQuote({
      catalog,
      selection,
      pricing,
      perimeterM: effectivePerimeterM,
      fenceEnabled: scope.fence,
      bramaEnabled,
      bramaElementId,
      bramaOccupiedSpanM,
      furtkaEnabled,
      furtkaElementId,
      furtkaPositionLabel: openingPositionLabels[furtkaPosition],
      fallbackPanelCount: previewPanelCount,
    });
  }, [
    catalog,
    selection,
    pricing,
    quoteFenceClosed,
    quotePerimeterM,
    quoteFenceScope,
    manualQuotePerimeterM,
    manualQuoteFrontLengthM,
    scope.fence,
    bramaEnabled,
    bramaElementId,
    bramaOccupiedSpanM,
    furtkaEnabled,
    furtkaElementId,
    furtkaPosition,
    previewPanelCount,
  ]);

  const effectiveQuotePerimeterM = useMemo(
    () =>
      resolveQuotePerimeterM({
        quoteFenceClosed,
        quotePerimeterM,
        quoteFenceScope,
        manualQuotePerimeterM,
        manualQuoteFrontLengthM,
      }),
    [
      quoteFenceClosed,
      quotePerimeterM,
      quoteFenceScope,
      manualQuotePerimeterM,
      manualQuoteFrontLengthM,
    ],
  );

  const nextTab = getNextConfiguratorTab(activeTab, scope);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!pdfContainerRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await generateConfiguratorPdf(pdfContainerRef.current);
    } catch (error) {
      console.error("[PDF] Nie udało się wygenerować pliku:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hidden border-b border-cfg-sidebar-border px-5 py-4 lg:block">
        <h1 className="font-heading text-lg font-bold text-white max-lg:text-base">
          Konfigurator Ogrodzenia
        </h1>
        <p className="mt-0.5 text-[11px] text-cfg-sidebar-muted">
          Seria Betonowa | Wielkopolska
        </p>
      </div>

      <ConfiguratorTabs active={activeTab} onChange={onTabChange} />

      <div className="mobile-drawer-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 scrollbar-dark max-lg:px-4 max-lg:landscape:py-3">
        {activeTab === "model" && (
          <div className="space-y-6">
            <div>
              <SectionLabel>Wariant ogrodzenia</SectionLabel>
              <div className="flex flex-col gap-2">
                {catalog.fenceVariants.map((variant: FenceVariant) => {
                  const heightM = selectedHeight?.valueM ?? 2;
                  const versions = getStackVersions(variant);
                  const firstVersion = versions[0];
                  const unitPrice = calculateStackUnitPrice(
                    catalog,
                    variant,
                    heightM,
                    selection.colorId,
                    false,
                    selectedHeight?.priceMultiplier ?? 1,
                    null,
                    firstVersion?.id ?? null,
                  );
                  const versionInfo =
                    versions.length > 1
                      ? `${versions.length} wersje`
                      : null;
                  return (
                    <ModelCard
                      key={variant.id}
                      selected={selection.fenceVariantId === variant.id}
                      title={variant.name}
                      subtitle={`${unitPrice.toLocaleString("pl-PL")} PLN/odcinek${versionInfo ? ` · ${versionInfo}` : ""}`}
                      onClick={() =>
                        onSelect({
                          fenceVariantId: variant.id,
                          stackVersionId: versions[0]?.id ?? null,
                          azurowoscEnabled: false,
                          azurowoscGapCm: null,
                        })
                      }
                    />
                  );
                })}
              </div>
            </div>

            {selectedVariant && stackVersions.length > 0 && (
              <div>
                <SectionLabel>Wersja</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {stackVersions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() =>
                        onSelect({ stackVersionId: version.id })
                      }
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all",
                        selection.stackVersionId === version.id
                          ? "border-[#ff3131] bg-[#2a1515] text-white"
                          : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface text-cfg-sidebar-subtle hover:border-cfg-sidebar-border",
                      )}
                    >
                      {version.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedVariant &&
              activeStackVersion &&
              versionSupportsAzurowosc(activeStackVersion) && (
              <div>
                <SectionLabel>Ażurowość</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSelect({ azurowoscEnabled: false, azurowoscGapCm: null })
                    }
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all",
                      !selection.azurowoscEnabled
                        ? "border-[#ff3131] bg-[#2a1515] text-white"
                        : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface text-cfg-sidebar-subtle hover:border-cfg-sidebar-border",
                    )}
                  >
                    Szczelne
                  </button>
                  {(getAzurGapOptions(activeStackVersion).length > 0
                    ? getAzurGapOptions(activeStackVersion)
                    : [null]
                  ).map((gap) => {
                    const active =
                      selection.azurowoscEnabled &&
                      (gap === null || selection.azurowoscGapCm === gap);
                    const panels = countAzurPanels(
                      catalog,
                      selectedVariant,
                      selectedHeight?.valueM ?? 2,
                      gap,
                      selection.stackVersionId,
                    );
                    return (
                      <button
                        key={gap ?? "legacy"}
                        type="button"
                        onClick={() =>
                          onSelect({
                            azurowoscEnabled: true,
                            azurowoscGapCm: gap,
                          })
                        }
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all",
                          active
                            ? "border-[#ff3131] bg-[#2a1515] text-white"
                            : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface text-cfg-sidebar-subtle hover:border-cfg-sidebar-border",
                        )}
                      >
                        {gap === null ? "Z przerwami" : `Ażur ${gap} cm`}
                        <span className="mt-0.5 block text-[10px] font-normal opacity-70">
                          {panels} paneli
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <SectionLabel>Kolor (RAL)</SectionLabel>
              <div className="mb-4 flex flex-wrap gap-3">
                {catalog.colors.map((color: Color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => onSelect({ colorId: color.id })}
                    title={color.name}
                    className={cn(
                      "h-12 w-12 rounded-lg border-2 transition-all",
                      selection.colorId === color.id
                        ? "border-[#ff3131] ring-2 ring-[#ff3131]/40 ring-offset-2 ring-offset-cfg-sidebar scale-110"
                        : "border-cfg-sidebar-border hover:border-white/40",
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
              {selectedColor && (
                <p className="text-sm text-cfg-sidebar-subtle">
                  Wybrany:{" "}
                  <span className="font-semibold text-white">
                    {selectedColor.name}
                  </span>{" "}
                  <span className="font-mono text-cfg-sidebar-muted">{selectedColor.hex}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "dimensions" && (
          <div>
            <SectionLabel>Szerokość podglądu — panele</SectionLabel>
            <div className="mb-6 rounded-lg border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  {previewPanelCount} paneli
                </span>
                <span className="text-[10px] uppercase tracking-wider text-cfg-sidebar-muted">
                  {MIN_PREVIEW_PANELS}–{MAX_PREVIEW_PANELS}
                </span>
              </div>
              <input
                type="range"
                min={MIN_PREVIEW_PANELS}
                max={MAX_PREVIEW_PANELS}
                value={previewPanelCount}
                onChange={(e) => setPreviewPanelCount(Number(e.target.value))}
                className="w-full accent-[#ff3131]"
              />
              <p className="mt-2 text-[10px] leading-relaxed text-cfg-sidebar-muted max-lg:landscape:hidden">
                Przeciągnij boczne uchwyty płotu w podglądzie, aby szybko
                dodać lub usunąć panele.
              </p>
            </div>

            <SectionLabel>Wysokość — presety</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {allowedHeights.map((height: Height) => (
                <button
                  key={height.id}
                  type="button"
                  onClick={() => onSelect({ heightId: height.id })}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-center transition-all",
                    selection.heightId === height.id
                      ? "border-[#ff3131] bg-[#2a1515] text-white"
                      : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface text-cfg-sidebar-subtle hover:border-cfg-sidebar-border",
                  )}
                >
                  <span className="block font-heading text-lg font-bold">
                    {height.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-cfg-sidebar-subtle">
                    {formatHeightMultiplier(height.priceMultiplier)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "gates" && (
          <div className="space-y-6">
            {scope.gate && features.bramaEnabled && (
            <div>
              <SectionLabel>Brama wjazdowa</SectionLabel>
              <div className="flex flex-col gap-2">
                <ModelCard
                  selected={!bramaElementId}
                  title="Bez bramy"
                  subtitle="Ciągłe ogrodzenie panelowe"
                  onClick={() => setBramaElementId(null)}
                />
                {bramaOptions.map((element) => (
                  <ModelCard
                    key={element.id}
                    selected={bramaElementId === element.id}
                    title={element.name}
                    subtitle={formatElementPriceSubtitle(element)}
                    onClick={() => setBramaElementId(element.id)}
                  />
                ))}
              </div>
              {bramaOptions.length === 0 && (
                <p className="mt-2 text-[11px] text-cfg-sidebar-subtle">
                  Brak aktywnych bram w katalogu — dodaj je w panelu admina.
                </p>
              )}
              {bramaEnabled && (
                <p className="mt-3 text-[11px] leading-relaxed text-cfg-sidebar-subtle">
                  Przejdź do zakładki <strong className="text-[#ccc]">Wycena</strong>,
                  zamknij obrys i przeciągnij uchwyty <strong className="text-[#ccc]">B1/B2</strong>{" "}
                  wzdłuż linii ogrodzenia, aby ustawić szerokość bramy.
                </p>
              )}
            </div>
            )}

            {scope.wicket && features.furtkaEnabled && (
            <div>
              <SectionLabel>Furtka</SectionLabel>
              <div className="flex flex-col gap-2">
                <ModelCard
                  selected={!furtkaElementId}
                  title="Bez furtki"
                  subtitle="Ciągłe ogrodzenie panelowe"
                  onClick={() => setFurtkaElementId(null)}
                />
                {furtkaOptions.map((element) => (
                  <ModelCard
                    key={element.id}
                    selected={furtkaElementId === element.id}
                    title={element.name}
                    subtitle={formatElementPriceSubtitle(element)}
                    onClick={() => setFurtkaElementId(element.id)}
                  />
                ))}
              </div>
              {furtkaOptions.length === 0 && (
                <p className="mt-2 text-[11px] text-cfg-sidebar-subtle">
                  Brak aktywnych furtek w katalogu — dodaj je w panelu admina.
                </p>
              )}
              {furtkaEnabled && (
                <p className="mt-3 text-[11px] leading-relaxed text-cfg-sidebar-subtle">
                  Na zakładce <strong className="text-[#ccc]">Wycena</strong> przeciągnij marker{" "}
                  <strong className="text-[#ccc]">F</strong> wzdłuż obrysu, aby wskazać miejsce
                  furtki (stała szerokość 1 panelu).
                </p>
              )}
            </div>
            )}

            {(scope.gate || scope.wicket) && (
            <div>
              <SectionLabel>Wybór słupka</SectionLabel>
              <div className="flex flex-col gap-2">
                {catalog.posts.map((post: Post) => (
                  <ModelCard
                    key={post.id}
                    selected={selection.postId === post.id}
                    title={post.name}
                    subtitle={`Szerokość ${post.widthCm} cm`}
                    onClick={() => onSelect({ postId: post.id })}
                  />
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {activeTab === "quote" && (
          <QuoteSidebarPanel catalog={catalog} selection={selection} />
        )}

        {activeTab === "review" && (
          <div className="space-y-6">
            <div>
              <SectionLabel>Tło podglądu</SectionLabel>
              <BackgroundPicker />
            </div>

            <div className="space-y-4">
              <SectionLabel>Twoja konfiguracja</SectionLabel>
            {[
              { label: "Wariant", value: selectedVariant?.name },
              { label: "Wersja", value: activeStackVersion?.name },
              { label: "Kolor", value: selectedColor?.name },
              {
                label: "Ażurowość",
                value:
                  activeStackVersion &&
                  versionSupportsAzurowosc(activeStackVersion) &&
                  selection.azurowoscEnabled
                    ? `${selection.azurowoscGapCm != null ? `${selection.azurowoscGapCm} cm · ` : ""}${countAzurPanels(catalog, selectedVariant!, selectedHeight?.valueM ?? 2, selection.azurowoscGapCm, selection.stackVersionId)} paneli`
                    : "Nie",
              },
              { label: "Wysokość", value: selectedHeight?.label },
              { label: "Panele w podglądzie", value: `${previewPanelCount} szt.` },
              { label: "Słupek", value: selectedPost?.name },
              {
                label: "Brama wjazdowa",
                value:
                  quote.configurationItems.find((i) => i.label === "Brama wjazdowa")
                    ?.value ?? "Nie",
              },
              {
                label: "Furtka",
                value:
                  quote.configurationItems.find((i) => i.label === "Furtka")
                    ?.value ?? "Nie",
              },
              {
                label: "Długość z rzutu",
                value: quoteFenceClosed && quotePerimeterM
                  ? `${quotePerimeterM.toFixed(1)} m bieżących`
                  : "—",
              },
              {
                label: "Stawka za panel",
                value: scope.fence
                  ? `${quote.pricePerPanelNet.toLocaleString("pl-PL")} PLN/panel`
                  : "—",
              },
              {
                label: "Wycena orientacyjna",
                value: `${Math.round(quote.totalNet).toLocaleString("pl-PL")} PLN netto`,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-cfg-sidebar-border py-2.5"
              >
                <span className="text-[11px] uppercase tracking-wider text-cfg-sidebar-muted">
                  {label}
                </span>
                <span className="text-sm font-semibold text-white">
                  {value ?? "—"}
                </span>
              </div>
            ))}
            {selectedColor && (
              <div className="flex items-center gap-3 rounded-lg bg-cfg-sidebar-surface p-3">
                <span
                  className="h-10 w-10 rounded-lg border border-cfg-sidebar-border"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedColor.name}
                  </p>
                  <p className="font-mono text-xs text-cfg-sidebar-muted">
                    {selectedColor.hex}
                  </p>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cfg-sidebar-muted">
                Składniki ceny
              </p>
              <div className="space-y-1.5">
                {quote.breakdown.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="flex justify-between gap-2 text-[11px]"
                  >
                    <span className="text-cfg-sidebar-subtle">{row.label}</span>
                    {row.amount > 0 ? (
                      <span className="font-semibold text-white">
                        {Math.round(row.amount).toLocaleString("pl-PL")} PLN
                      </span>
                    ) : (
                      <span className="text-cfg-sidebar-muted">{row.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>

            <PdfDocument
              ref={pdfContainerRef}
              catalog={catalog}
              selection={selection}
              pricing={pricing}
              scope={scope}
              quote={quote}
              selectedVariant={selectedVariant}
              selectedColor={selectedColor}
              selectedHeight={selectedHeight}
              selectedPost={selectedPost}
              previewPanelCount={previewPanelCount}
              effectiveQuotePerimeterM={effectiveQuotePerimeterM}
              bramaEnabled={bramaEnabled}
              bramaElementId={bramaElementId}
              furtkaEnabled={furtkaEnabled}
              furtkaElementId={furtkaElementId}
              furtkaPosition={furtkaPosition}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-cfg-sidebar-border bg-cfg-sidebar-footer px-5 py-4 max-lg:landscape:px-4 max-lg:landscape:py-2">
        <div className="mb-3 max-lg:landscape:mb-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cfg-sidebar-muted">
              Wycena orientacyjna
            </span>
            <span className="font-heading text-xl font-bold text-white max-lg:landscape:text-lg">
              {Math.round(quote.totalNet).toLocaleString("pl-PL")}{" "}
              <span className="text-sm font-semibold text-cfg-sidebar-subtle max-lg:landscape:text-xs">
                PLN netto
              </span>
            </span>
          </div>
          <p className="mt-1 text-right text-[10px] text-cfg-sidebar-muted max-lg:landscape:hidden">
            {scope.fence ? (
              <>
                {quote.pricePerPanelNet.toLocaleString("pl-PL")} PLN/odcinek ·{" "}
                {quote.estimatedPanels} odcinków
              </>
            ) : (
              <>Brama i furtka — ceny jednorazowe</>
            )}
          </p>
        </div>
        {activeTab === "review" ? (
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff3131] py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors max-lg:landscape:py-2.5",
              isGeneratingPdf ? "cursor-wait opacity-60" : "hover:bg-[#e02020]",
            )}
          >
            <FileDown className="h-4 w-4" />
            {isGeneratingPdf ? "Generowanie PDF…" : "Pobierz PDF"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!nextTab}
            onClick={() => nextTab && onTabChange(nextTab)}
            className={cn(
              "w-full rounded-lg bg-[#ff3131] py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors max-lg:landscape:py-2.5",
              nextTab ? "hover:bg-[#e02020]" : "cursor-not-allowed opacity-50",
            )}
          >
            Przejdź dalej
          </button>
        )}
      </div>
    </div>
  );
}
