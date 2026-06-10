"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CatalogCollections,
  ConfiguratorSelection,
  Color,
  Height,
  Panel,
  Post,
  SpacerOption,
} from "@/lib/types";
import {
  type ConfiguratorTab,
  type GatePosition,
  MAX_PREVIEW_PANELS,
  MIN_PREVIEW_PANELS,
  useConfiguratorStore,
} from "@/lib/configurator/state";
import { ConfiguratorTabs } from "./ConfiguratorTabs";

type Props = {
  catalog: CatalogCollections;
  selection: ConfiguratorSelection;
  activeTab: ConfiguratorTab;
  onSelect: (partial: Partial<ConfiguratorSelection>) => void;
  onTabChange: (tab: ConfiguratorTab) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666]">
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
          : "border-[#333] bg-[#222] hover:border-[#444] hover:bg-[#282828]",
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          selected
            ? "border-[#ff3131] bg-[#ff3131]"
            : "border-[#555] bg-transparent",
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
        <p className="text-[11px] text-[#666]">{subtitle}</p>
      </div>
    </button>
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
  const selectedPanel = catalog.panels.find((p) => p.id === selection.panelId);
  const selectedPost = catalog.posts.find((p) => p.id === selection.postId);
  const selectedSpacer = catalog.spacerOptions.find(
    (s) => s.id === selection.spacerId,
  );
  const gateEnabled = useConfiguratorStore((s) => s.gateEnabled);
  const gatePosition = useConfiguratorStore((s) => s.gatePosition);
  const setGateEnabled = useConfiguratorStore((s) => s.setGateEnabled);
  const setGatePosition = useConfiguratorStore((s) => s.setGatePosition);
  const previewPanelCount = useConfiguratorStore((s) => s.previewPanelCount);
  const setPreviewPanelCount = useConfiguratorStore((s) => s.setPreviewPanelCount);

  const gatePositionLabels: Record<GatePosition, string> = {
    left: "Lewa sekcja",
    center: "Środkowa sekcja",
    right: "Prawa sekcja",
  };

  const heightCm = selectedHeight
    ? Math.round(selectedHeight.valueM * 100)
    : 150;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#2a2a2a] px-5 py-4">
        <h1 className="font-heading text-lg font-bold text-white">
          Konfigurator Ogrodzenia
        </h1>
        <p className="mt-0.5 text-[11px] text-[#666]">
          Seria Betonowa | Wielkopolska
        </p>
      </div>

      <ConfiguratorTabs active={activeTab} onChange={onTabChange} />

      <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-dark">
        {activeTab === "model" && (
          <div className="space-y-6">
            <div>
              <SectionLabel>Wybór modelu</SectionLabel>
              <div className="flex flex-col gap-2">
                {catalog.panels.map((panel: Panel) => (
                  <ModelCard
                    key={panel.id}
                    selected={selection.panelId === panel.id}
                    title={panel.name}
                    subtitle={`Wzór: ${panel.patternId.replace("pattern-", "")}`}
                    onClick={() => onSelect({ panelId: panel.id })}
                  />
                ))}
              </div>
            </div>

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
                        ? "border-[#ff3131] ring-2 ring-[#ff3131]/40 ring-offset-2 ring-offset-[#1a1a1a] scale-110"
                        : "border-[#444] hover:border-[#666]",
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
              {selectedColor && (
                <p className="text-sm text-[#888]">
                  Wybrany:{" "}
                  <span className="font-semibold text-white">
                    {selectedColor.name}
                  </span>{" "}
                  <span className="font-mono text-[#666]">{selectedColor.hex}</span>
                </p>
              )}
            </div>

            <div>
              <SectionLabel>Dystans / ażurowość</SectionLabel>
              <div className="flex flex-col gap-2">
                {catalog.spacerOptions.map((spacer: SpacerOption) => (
                  <ModelCard
                    key={spacer.id}
                    selected={selection.spacerId === spacer.id}
                    title={spacer.name}
                    subtitle={
                      spacer.hasSpacer
                        ? `Ażurowość ${Math.round(spacer.openness * 100)}%`
                        : "Pełne panele bez przerw"
                    }
                    onClick={() => onSelect({ spacerId: spacer.id })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "dimensions" && (
          <div>
            <SectionLabel>Szerokość podglądu — panele</SectionLabel>
            <div className="mb-6 rounded-lg border border-[#333] bg-[#222] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  {previewPanelCount} paneli
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#666]">
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
              <p className="mt-2 text-[10px] leading-relaxed text-[#666]">
                Przeciągnij boczne uchwyty płotu w podglądzie, aby szybko
                dodać lub usunąć panele.
              </p>
            </div>

            <SectionLabel>Wysokość — presety</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {catalog.heights.map((height: Height) => (
                <button
                  key={height.id}
                  type="button"
                  onClick={() => onSelect({ heightId: height.id })}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-center transition-all",
                    selection.heightId === height.id
                      ? "border-[#ff3131] bg-[#2a1515] text-white"
                      : "border-[#333] bg-[#222] text-[#888] hover:border-[#444]",
                  )}
                >
                  <span className="font-heading text-lg font-bold">
                    {height.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "gates" && (
          <div className="space-y-6">
            <div>
              <SectionLabel>Furtka</SectionLabel>
              <div className="flex flex-col gap-2">
                <ModelCard
                  selected={!gateEnabled}
                  title="Bez furtki"
                  subtitle="Ciągłe ogrodzenie panelowe"
                  onClick={() => setGateEnabled(false)}
                />
                <ModelCard
                  selected={gateEnabled}
                  title="Z furtką"
                  subtitle="Wąskie wejście w wybranej sekcji"
                  onClick={() => setGateEnabled(true)}
                />
              </div>
              {gateEnabled && (
                <div className="mt-4">
                  <SectionLabel>Pozycja furtki</SectionLabel>
                  <div className="grid grid-cols-1 gap-2">
                    {(["left", "center", "right"] as GatePosition[]).map(
                      (pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setGatePosition(pos)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all",
                            gatePosition === pos
                              ? "border-[#ff3131] bg-[#2a1515] text-white"
                              : "border-[#333] bg-[#222] text-[#888] hover:border-[#444]",
                          )}
                        >
                          {gatePositionLabels[pos]}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

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
          </div>
        )}

        {activeTab === "review" && (
          <div className="space-y-4">
            <SectionLabel>Twoja konfiguracja</SectionLabel>
            {[
              { label: "Model panelu", value: selectedPanel?.name },
              { label: "Kolor", value: selectedColor?.name },
              { label: "Dystans", value: selectedSpacer?.name },
              { label: "Wysokość", value: selectedHeight?.label },
              { label: "Panele w podglądzie", value: `${previewPanelCount} szt.` },
              { label: "Słupek", value: selectedPost?.name },
              {
                label: "Furtka",
                value: gateEnabled
                  ? `Tak · ${gatePositionLabels[gatePosition]}`
                  : "Nie",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-[#2a2a2a] py-2.5"
              >
                <span className="text-[11px] uppercase tracking-wider text-[#666]">
                  {label}
                </span>
                <span className="text-sm font-semibold text-white">
                  {value ?? "—"}
                </span>
              </div>
            ))}
            {selectedColor && (
              <div className="flex items-center gap-3 rounded-lg bg-[#222] p-3">
                <span
                  className="h-10 w-10 rounded-lg border border-[#444]"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedColor.name}
                  </p>
                  <p className="font-mono text-xs text-[#666]">
                    {selectedColor.hex}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#2a2a2a] bg-[#161616] px-5 py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#666]">
            Wycena orientacyjna
          </span>
          <span className="font-heading text-xl font-bold text-white">
            {Math.round(previewPanelCount * heightCm * 3.2).toLocaleString("pl-PL")}{" "}
            <span className="text-sm font-semibold text-[#888]">PLN netto</span>
          </span>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-[#ff3131] py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#e02020]"
        >
          Zapisz konfigurację
        </button>
      </div>
    </div>
  );
}
