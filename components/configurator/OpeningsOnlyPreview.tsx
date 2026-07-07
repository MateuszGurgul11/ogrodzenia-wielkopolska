"use client";

import { useMemo } from "react";
import { buildFenceSvg, getViewWidth, VIEW_H } from "@/lib/fence/renderFence";
import { useConfiguratorStore } from "@/lib/configurator/state";
import type { CatalogCollections } from "@/lib/types";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { resolveElement } from "@/lib/pricing/element-prices";
import { resolveOpeningTextureUrl } from "@/lib/fence/resolveTexture";
import {
  resolveFenceVariant,
  resolvePostHeightCm,
} from "@/lib/fence/resolveStack";
import { PreviewControlsBar } from "./PreviewControlsBar";

type Props = {
  catalog: CatalogCollections;
};

export function OpeningsOnlyPreview({ catalog }: Props) {
  const scope = useConfiguratorStore((s) => s.scope);
  const selection = useConfiguratorStore((s) => s.selection);
  const pricing = useConfiguratorStore((s) => s.pricing);
  const bramaElementId = useConfiguratorStore((s) => s.bramaElementId);
  const furtkaElementId = useConfiguratorStore((s) => s.furtkaElementId);
  const bramaEnabled = useConfiguratorStore((s) => s.bramaEnabled);
  const furtkaEnabled = useConfiguratorStore((s) => s.furtkaEnabled);

  const quote = useMemo(
    () =>
      calculateQuote({
        catalog,
        selection,
        pricing,
        fenceEnabled: false,
        bramaEnabled,
        bramaElementId,
        furtkaEnabled,
        furtkaElementId,
      }),
    [
      catalog,
      selection,
      pricing,
      bramaEnabled,
      bramaElementId,
      furtkaEnabled,
      furtkaElementId,
    ],
  );

  const brama = bramaEnabled
    ? resolveElement(catalog, "brama", bramaElementId)
    : undefined;
  const furtka = furtkaEnabled
    ? resolveElement(catalog, "furtka", furtkaElementId)
    : undefined;

  const post = catalog.posts.find((p) => p.id === selection.postId);
  const height = catalog.heights.find((h) => h.id === selection.heightId);
  const color = catalog.colors.find((c) => c.id === selection.colorId);

  const hasDrivewayGate = bramaEnabled && Boolean(bramaElementId);
  const hasWicket = furtkaEnabled && Boolean(furtkaElementId);

  const svgMarkup = useMemo(() => {
    if (!post || !height || !color) return null;
    if (!hasDrivewayGate && !hasWicket) return null;

    const panelCount = hasDrivewayGate ? 2 : 1;
    const openingPanelIndices: number[] = [];
    if (hasWicket && !hasDrivewayGate) {
      openingPanelIndices.push(0);
    }

    const variant = resolveFenceVariant(catalog, selection.fenceVariantId);

    const openingTextureUrl = hasWicket
      ? resolveOpeningTextureUrl(catalog, "furtka", furtkaElementId)
      : hasDrivewayGate
        ? resolveOpeningTextureUrl(catalog, "brama", bramaElementId)
        : null;

    return buildFenceSvg({
      heightM: height.valueM,
      patternId: "pattern-solid",
      colorHex: color.hex,
      postWidthCm: post.widthCm,
      panelCount,
      openingPanelIndices,
      transparent: true,
      openingTextureUrl,
      postHeightCm: variant
        ? resolvePostHeightCm(variant, height.valueM)
        : undefined,
    });
  }, [
    post,
    height,
    color,
    catalog,
    selection.fenceVariantId,
    hasDrivewayGate,
    hasWicket,
    bramaElementId,
    furtkaElementId,
  ]);

  const aspectRatio = useMemo(() => {
    const panelCount = hasDrivewayGate ? 2 : hasWicket ? 1 : 1;
    const viewW = getViewWidth(panelCount);
    return viewW / VIEW_H;
  }, [hasDrivewayGate, hasWicket]);

  return (
    <div className="flex w-full flex-1 flex-col bg-gradient-to-b from-[#1a1a1a] to-[#111]">
      <div className="relative flex flex-1 flex-col max-lg:min-h-[40dvh]">
        <div className="lg:hidden">
          <PreviewControlsBar className="left-3 right-auto top-3" accent />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 max-lg:px-4 max-lg:py-6">
        {svgMarkup ? (
          <div
            className="w-full max-w-3xl"
            style={{ aspectRatio: `${aspectRatio}` }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-[#333] bg-[#222] p-6 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff3131]">
              Elementy otwierające
            </p>
            <h2 className="mt-2 font-heading text-xl font-bold text-white">
              Podgląd konfiguracji
            </h2>
            <p className="mt-1 text-sm text-[#888]">
              Wybierz typ bramy i furtki w panelu bocznym, aby zobaczyć podgląd.
            </p>
          </div>
        )}
        </div>
      </div>

      <div className="hidden border-t border-[#2a2a2a] bg-[#1a1a1a]/90 px-6 py-4 backdrop-blur lg:block">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {scope.gate && (
              <span className="text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#666]">
                  Brama:{" "}
                </span>
                <span className="font-semibold">
                  {brama?.name ?? "wybierz w zakładce Elementy"}
                </span>
                {brama && (
                  <span className="ml-1 text-[#ff3131]">
                    {quote.bramaPrice.toLocaleString("pl-PL")} PLN netto
                  </span>
                )}
              </span>
            )}
            {scope.wicket && (
              <span className="text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#666]">
                  Furtka:{" "}
                </span>
                <span className="font-semibold">
                  {furtka?.name ?? "wybierz w zakładce Elementy"}
                </span>
                {furtka && (
                  <span className="ml-1 text-[#ff3131]">
                    {quote.furtkaPrice.toLocaleString("pl-PL")} PLN netto
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-[#888]">Razem netto</span>
            <span className="font-heading text-2xl font-bold text-white">
              {Math.round(quote.totalNet).toLocaleString("pl-PL")} PLN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
