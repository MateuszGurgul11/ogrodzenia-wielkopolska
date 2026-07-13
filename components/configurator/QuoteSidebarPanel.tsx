"use client";

import { useMemo, useRef } from "react";
import {
  ImagePlus,
  Undo2,
  Trash2,
  Check,
  X,
  ArrowLeft,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import {
  ACCEPTED_BG_TYPES,
  MAX_BG_SIZE,
  validateBackgroundFile,
} from "@/lib/configurator/backgrounds";
import {
  MAX_PREVIEW_PANELS,
  resolveQuotePerimeterM,
  useConfiguratorStore,
  type QuoteFenceScope,
} from "@/lib/configurator/state";
import type {
  CatalogCollections,
  ConfiguratorSelection,
  QuoteResult,
} from "@/lib/types";
import { DecimalInput } from "./DecimalInput";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-cfg-sidebar-muted">
      {children}
    </p>
  );
}

const CARD_CLASS = "rounded-xl border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-4";

const QUOTE_SCOPE_LABELS: Record<QuoteFenceScope, string> = {
  "full-perimeter": "Całe ogrodzenie",
  "front-only": "Tylko front",
};

const QUOTE_LENGTH_LABELS: Record<QuoteFenceScope, string> = {
  "full-perimeter": "Długość bieżąca",
  "front-only": "Długość frontu",
};

function ScopeCard({
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
        "flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition-all",
        selected
          ? "border-[#ff3131] bg-[#2a1515]"
          : "border-cfg-sidebar-surface-border bg-cfg-sidebar-surface hover:border-cfg-sidebar-border hover:bg-cfg-sidebar-surface-hover",
      )}
    >
      <div className="flex w-full items-center gap-2">
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
        <span className="text-xs font-bold text-white">{title}</span>
      </div>
      <span className="pl-7 text-[10px] leading-relaxed text-cfg-sidebar-subtle">
        {subtitle}
      </span>
    </button>
  );
}

function QuoteCalculationBlock({
  quote,
  previewPanelsFromQuote,
  quoteFenceScope,
  showFenceMetrics,
}: {
  quote: QuoteResult;
  previewPanelsFromQuote: number;
  quoteFenceScope: QuoteFenceScope;
  showFenceMetrics: boolean;
}) {
  return (
    <>
      <div>
        <SectionLabel>Wybrana konfiguracja</SectionLabel>
        <div className="mb-4 space-y-2 rounded-lg border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-4">
          {showFenceMetrics && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-cfg-sidebar-subtle">Zakres wyceny</span>
              <span className="text-right font-semibold text-white">
                {QUOTE_SCOPE_LABELS[quoteFenceScope]}
              </span>
            </div>
          )}
          {quote.configurationItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-cfg-sidebar-subtle">{item.label}</span>
              <span className="text-right font-semibold text-white">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Kalkulacja</SectionLabel>
        <div className="space-y-2 rounded-lg border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-4">
          {showFenceMetrics && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-cfg-sidebar-subtle">
                  {QUOTE_LENGTH_LABELS[quoteFenceScope]}
                </span>
                <span className="font-semibold text-white">
                  {quote.perimeterM.toFixed(1)} m
                  {!quote.hasMeasuredPerimeter && (
                    <span className="ml-1 text-cfg-sidebar-muted">(szacunek)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cfg-sidebar-subtle">Szac. liczba paneli</span>
                <span className="text-right font-semibold text-white">
                  {quote.estimatedPanels} szt.
                </span>
              </div>
              {quote.estimatedPanels > MAX_PREVIEW_PANELS && (
                <p className="text-[10px] leading-relaxed text-cfg-sidebar-subtle">
                  Podgląd pokazuje max {MAX_PREVIEW_PANELS} paneli (obecnie:{" "}
                  {previewPanelsFromQuote}).
                </p>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-cfg-sidebar-subtle">Stawka za panel</span>
                <span className="font-semibold text-white">
                  {quote.pricePerPanelNet.toLocaleString("pl-PL")} PLN/panel
                </span>
              </div>
              <div className="my-2 border-t border-cfg-sidebar-surface-border" />
            </>
          )}
          {quote.breakdown.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              className="flex justify-between gap-2 text-[11px]"
            >
              <span className="text-cfg-sidebar-subtle">
                {row.label}
                {row.value ? (
                  <span className="block text-[10px] text-cfg-sidebar-subtle">{row.value}</span>
                ) : null}
              </span>
              {row.amount > 0 && (
                <span className="shrink-0 font-semibold text-white">
                  {Math.round(row.amount).toLocaleString("pl-PL")} PLN
                </span>
              )}
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between border-t border-cfg-sidebar-surface-border pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cfg-sidebar-muted">
              Razem netto
            </span>
            <span className="font-heading text-xl font-bold text-[#ff3131]">
              {Math.round(quote.totalNet).toLocaleString("pl-PL")}{" "}
              <span className="text-sm text-cfg-sidebar-subtle">{quote.currency}</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

type Props = {
  catalog: CatalogCollections;
  selection: ConfiguratorSelection;
};

export function QuoteSidebarPanel({ catalog, selection }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quotePlanImageUrl = useConfiguratorStore((s) => s.quotePlanImageUrl);
  const quoteDrawMode = useConfiguratorStore((s) => s.quoteDrawMode);
  const quoteCalibrationLine = useConfiguratorStore((s) => s.quoteCalibrationLine);
  const quoteCalibrationLengthM = useConfiguratorStore(
    (s) => s.quoteCalibrationLengthM,
  );
  const quoteFencePoints = useConfiguratorStore((s) => s.quoteFencePoints);
  const quoteFenceClosed = useConfiguratorStore((s) => s.quoteFenceClosed);
  const quotePxPerMeter = useConfiguratorStore((s) => s.quotePxPerMeter);
  const quotePerimeterM = useConfiguratorStore((s) => s.quotePerimeterM);
  const manualQuotePerimeterM = useConfiguratorStore((s) => s.manualQuotePerimeterM);
  const quoteFenceScope = useConfiguratorStore((s) => s.quoteFenceScope);
  const manualQuoteFrontLengthM = useConfiguratorStore(
    (s) => s.manualQuoteFrontLengthM,
  );
  const quoteAdvancedView = useConfiguratorStore((s) => s.quoteAdvancedView);
  const scope = useConfiguratorStore((s) => s.scope);
  const bramaEnabled = useConfiguratorStore((s) => s.bramaEnabled);
  const bramaElementId = useConfiguratorStore((s) => s.bramaElementId);
  const bramaOccupiedSpanM = useConfiguratorStore((s) => s.bramaOccupiedSpanM);
  const furtkaEnabled = useConfiguratorStore((s) => s.furtkaEnabled);
  const furtkaElementId = useConfiguratorStore((s) => s.furtkaElementId);
  const furtkaPosition = useConfiguratorStore((s) => s.furtkaPosition);
  const previewPanelCount = useConfiguratorStore((s) => s.previewPanelCount);
  const pricing = useConfiguratorStore((s) => s.pricing);

  const setQuotePlanImage = useConfiguratorStore((s) => s.setQuotePlanImage);
  const setQuoteCalibrationLengthM = useConfiguratorStore(
    (s) => s.setQuoteCalibrationLengthM,
  );
  const setQuoteDrawMode = useConfiguratorStore((s) => s.setQuoteDrawMode);
  const setManualQuotePerimeterM = useConfiguratorStore(
    (s) => s.setManualQuotePerimeterM,
  );
  const setQuoteFenceScope = useConfiguratorStore((s) => s.setQuoteFenceScope);
  const setManualQuoteFrontLengthM = useConfiguratorStore(
    (s) => s.setManualQuoteFrontLengthM,
  );
  const setQuoteAdvancedView = useConfiguratorStore((s) => s.setQuoteAdvancedView);
  const undoQuoteFencePoint = useConfiguratorStore((s) => s.undoQuoteFencePoint);
  const removeQuoteFencePointAt = useConfiguratorStore(
    (s) => s.removeQuoteFencePointAt,
  );
  const clearQuoteFence = useConfiguratorStore((s) => s.clearQuoteFence);
  const closeQuoteFence = useConfiguratorStore((s) => s.closeQuoteFence);
  const applyQuoteToPreview = useConfiguratorStore((s) => s.applyQuoteToPreview);

  const openingPositionLabels = {
    left: "lewa sekcja",
    center: "środkowa sekcja",
    right: "prawa sekcja",
  } as const;

  const effectivePerimeterM = useMemo(
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

  const quote = useMemo(
    () =>
      calculateQuote({
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
      }),
    [
      catalog,
      selection,
      pricing,
      effectivePerimeterM,
      scope.fence,
      bramaEnabled,
      bramaElementId,
      bramaOccupiedSpanM,
      furtkaEnabled,
      furtkaElementId,
      furtkaPosition,
      previewPanelCount,
    ],
  );

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = validateBackgroundFile(file);
    if (error) {
      alert(error);
      return;
    }
    if (!ACCEPTED_BG_TYPES.includes(file.type) || file.size > MAX_BG_SIZE) {
      return;
    }
    setQuotePlanImage(URL.createObjectURL(file));
  }

  const canCloseFence =
    quoteFencePoints.length >= 3 && !quoteFenceClosed && quotePxPerMeter;

  const previewPanelsFromQuote = Math.min(
    quote.estimatedPanels,
    MAX_PREVIEW_PANELS,
  );

  const canApplyToPreview =
    scope.fence && effectivePerimeterM != null && effectivePerimeterM > 0;

  return (
    <div className="space-y-5">
      {quoteAdvancedView ? (
        <button
          type="button"
          onClick={() => setQuoteAdvancedView(false)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-cfg-sidebar-border bg-cfg-sidebar-surface py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do prostego widoku
        </button>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl bg-cfg-sidebar-surface px-4 py-3.5 ring-1 ring-cfg-sidebar-surface-border">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff3131]">
              Wycena orientacyjna
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#9a9a95]">
              Wybierz zakres i podaj wymiar — policzymy liczbę paneli i cenę
              netto.
            </p>
          </div>

          {scope.fence && (
            <>
              <div>
                <SectionLabel>Co chcesz wycenić?</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <ScopeCard
                    selected={quoteFenceScope === "full-perimeter"}
                    title="A · Całe ogrodzenie"
                    subtitle="Obwód całej działki"
                    onClick={() => setQuoteFenceScope("full-perimeter")}
                  />
                  <ScopeCard
                    selected={quoteFenceScope === "front-only"}
                    title="B · Tylko front"
                    subtitle="Jeden bok przy ulicy"
                    onClick={() => setQuoteFenceScope("front-only")}
                  />
                </div>
              </div>

              {quoteFenceScope === "full-perimeter" ? (
                <div>
                  <SectionLabel>Podaj obwód działki</SectionLabel>
                  <div className={cn(CARD_CLASS, "space-y-3")}>
                    <p className="text-[11px] leading-relaxed text-[#9a9a95]">
                      Długość bieżąca ogrodzenia w metrach (suma boków działki).
                    </p>
                    <DecimalInput
                      value={manualQuotePerimeterM}
                      onChange={setManualQuotePerimeterM}
                      suffix="m bież."
                    />
                    {quoteFenceClosed && quotePerimeterM && (
                      <p className="text-[10px] leading-relaxed text-cfg-sidebar-subtle">
                        Na rzucie zmierzono{" "}
                        <strong className="text-[#ccc]">
                          {quotePerimeterM.toFixed(1)} m
                        </strong>{" "}
                        — ta wartość ma pierwszeństwo w kalkulacji.
                      </p>
                    )}
                    <div className="flex items-center justify-between rounded-lg border border-cfg-sidebar-border bg-cfg-sidebar-input px-3 py-2.5 text-xs">
                      <span className="text-cfg-sidebar-subtle">Szac. panele</span>
                      <span className="font-semibold text-white">
                        {quote.estimatedPanels} szt.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <SectionLabel>Długość frontu przy ulicy</SectionLabel>
                  <div className={cn(CARD_CLASS, "space-y-3")}>
                    <p className="text-[11px] leading-relaxed text-[#9a9a95]">
                      Szerokość działki od jednej granicy do drugiej przy drodze.
                    </p>
                    <DecimalInput
                      value={manualQuoteFrontLengthM}
                      onChange={setManualQuoteFrontLengthM}
                      suffix="m"
                    />
                    <div className="flex items-center justify-between rounded-lg border border-cfg-sidebar-border bg-cfg-sidebar-input px-3 py-2.5 text-xs">
                      <span className="text-cfg-sidebar-subtle">Szac. panele</span>
                      <span className="font-semibold text-white">
                        {quote.estimatedPanels} szt.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {quoteAdvancedView && (
        <>
          <div className="rounded-lg bg-[#ff3131] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              Wycena na rzucie
            </p>
            <p className="mt-1 text-[11px] text-white/85">
              1. Wgraj plan · 2. Ustaw skalę · 3. Zaznacz obwód · 4. Zamknij obrys
            </p>
          </div>

          <div>
            <SectionLabel>Rzut działki</SectionLabel>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#555] bg-white px-4 py-3 text-sm font-semibold text-[#303638] transition-colors hover:bg-[#f5f5f5]"
            >
              <ImagePlus className="h-4 w-4 text-[#ff3131]" />
              {quotePlanImageUrl ? "Zmień rzut" : "Prześlij rzut"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {quotePlanImageUrl && (
            <>
              <div>
                <SectionLabel>Kalibracja skali</SectionLabel>
                <div className="space-y-3 rounded-lg border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-4">
                  <p className="text-[11px] leading-relaxed text-cfg-sidebar-subtle">
                    Kliknij 2 punkty na znanej linii (np. bok działki 20 m), potem
                    wpisz jej długość w metrach.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuoteDrawMode("calibrate")}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold",
                      quoteDrawMode === "calibrate"
                        ? "border-[#ff3131] bg-[#2a1515] text-white"
                        : "border-cfg-sidebar-border text-cfg-sidebar-muted",
                    )}
                  >
                    Tryb: kalibracja skali
                  </button>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cfg-sidebar-muted">
                    Długość linii odniesienia (m)
                  </label>
                  <DecimalInput
                    value={quoteCalibrationLengthM}
                    onChange={setQuoteCalibrationLengthM}
                    suffix="m"
                  />
                  {quotePxPerMeter ? (
                    <p className="text-xs font-semibold text-[#4ade80]">
                      Skala ustawiona ({quotePxPerMeter.toFixed(1)} px/m)
                    </p>
                  ) : (
                    <p className="text-xs text-cfg-sidebar-muted">
                      {quoteCalibrationLine
                        ? "Wpisz długość linii w metrach"
                        : "Kliknij 2 punkty na rzucie"}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <SectionLabel>Obrys ogrodzenia</SectionLabel>
                <div className="space-y-2 rounded-lg border border-cfg-sidebar-surface-border bg-cfg-sidebar-surface p-4">
                  <p className="text-[11px] leading-relaxed text-cfg-sidebar-subtle">
                    Klikaj kolejne punkty na obwodzie działki (min. 3).
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!quotePxPerMeter}
                      onClick={() => setQuoteDrawMode("fence")}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wide disabled:opacity-40",
                        quoteDrawMode === "fence"
                          ? "border-[#ff3131] bg-[#2a1515] text-white"
                          : "border-cfg-sidebar-border text-cfg-sidebar-muted",
                      )}
                    >
                      Rysuj obrys
                    </button>
                    <button
                      type="button"
                      disabled={quoteFencePoints.length === 0}
                      onClick={undoQuoteFencePoint}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-cfg-sidebar-border text-cfg-sidebar-muted disabled:opacity-40"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={quoteFencePoints.length === 0}
                      onClick={clearQuoteFence}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-cfg-sidebar-border text-cfg-sidebar-muted disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {quoteFencePoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {quoteFencePoints.map((_, index) => (
                        <button
                          key={`point-${index}`}
                          type="button"
                          onClick={() => removeQuoteFencePointAt(index)}
                          className="flex items-center gap-1 rounded-md border border-cfg-sidebar-border bg-cfg-sidebar-input px-2 py-1 text-[11px] font-semibold text-[#ccc] hover:border-[#ff3131]"
                        >
                          <span>{index + 1}</span>
                          <X className="h-3 w-3 text-[#ff3131]" />
                        </button>
                      ))}
                    </div>
                  )}
                  {canCloseFence && (
                    <button
                      type="button"
                      onClick={closeQuoteFence}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff3131] py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                    >
                      <Check className="h-4 w-4" />
                      Zamknij obrys
                    </button>
                  )}
                  {quoteFenceClosed && quotePerimeterM && (
                    <p className="text-sm font-bold text-white">
                      Obwód: {quotePerimeterM.toFixed(1)} m bieżących
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <QuoteCalculationBlock
        quote={quote}
        previewPanelsFromQuote={previewPanelsFromQuote}
        quoteFenceScope={quoteFenceScope}
        showFenceMetrics={scope.fence}
      />

      {canApplyToPreview && (
        <button
          type="button"
          onClick={applyQuoteToPreview}
          className="w-full rounded-lg border border-[#ff3131]/40 bg-[#2a1515] py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#3a1a1a]"
        >
          Zastosuj do podglądu ({previewPanelsFromQuote} paneli)
        </button>
      )}

      {!quoteAdvancedView && scope.fence && (
        <button
          type="button"
          onClick={() => setQuoteAdvancedView(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-cfg-sidebar-border bg-cfg-sidebar-input py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          <Map className="h-4 w-4 text-[#ff3131]" />
          Zaawansowany widok (rzut działki)
        </button>
      )}
    </div>
  );
}
