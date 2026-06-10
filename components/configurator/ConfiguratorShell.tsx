"use client";

import { useEffect } from "react";
import Link from "next/link";
import { fetchActiveCatalog, isApiConfigured } from "@/lib/api/client";
import { useConfiguratorStore } from "@/lib/configurator/state";
import { useMounted } from "@/lib/hooks/use-mounted";
import { ConfiguratorHeader } from "./ConfiguratorHeader";
import { OptionSidebar } from "./OptionSidebar";
import { FencePreview } from "./FencePreview";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ConfiguratorSidebar({
  catalog,
  selection,
  activeTab,
  onSelect,
  onTabChange,
}: {
  catalog: NonNullable<ReturnType<typeof useConfiguratorStore.getState>["catalog"]>;
  selection: ReturnType<typeof useConfiguratorStore.getState>["selection"];
  activeTab: ReturnType<typeof useConfiguratorStore.getState>["activeTab"];
  onSelect: ReturnType<typeof useConfiguratorStore.getState>["setSelection"];
  onTabChange: ReturnType<typeof useConfiguratorStore.getState>["setActiveTab"];
}) {
  const sidebarOpen = useConfiguratorStore((s) => s.sidebarOpen);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-[#1a1a1a] transition-all duration-300 ease-out lg:border-r lg:border-[#2a2a2a]",
        sidebarOpen
          ? "w-full lg:w-[400px] xl:w-[420px]"
          : "w-0 overflow-hidden border-r-0 lg:w-0",
      )}
    >
      <div
        className={cn(
          "flex h-full w-full min-w-[280px] flex-col lg:min-w-[400px] xl:min-w-[420px]",
          !sidebarOpen && "pointer-events-none opacity-0",
        )}
      >
        <OptionSidebar
          catalog={catalog}
          selection={selection}
          activeTab={activeTab}
          onSelect={onSelect}
          onTabChange={onTabChange}
        />
      </div>
    </aside>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#1a1a1a]">
      <Loader2 className="h-10 w-10 animate-spin text-[#ff3131]" />
    </div>
  );
}

export function ConfiguratorShell() {
  const mounted = useMounted();
  const {
    catalog,
    loading,
    error,
    selection,
    activeTab,
    setCatalog,
    setLoading,
    setError,
    initSelection,
    setSelection,
    setActiveTab,
  } = useConfiguratorStore();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchActiveCatalog();
        if (cancelled) return;
        if (
          !data.posts.length ||
          !data.panels.length ||
          !data.spacerOptions.length ||
          !data.heights.length ||
          !data.colors.length
        ) {
          setError(
            "Katalog jest pusty. Zaloguj się do panelu admina i dodaj warianty lub uruchom seed danych.",
          );
        } else {
          setCatalog(data);
          initSelection(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Nie udało się załadować katalogu.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [setCatalog, setLoading, setError, initSelection]);

  const showDemoBanner = mounted && !isApiConfigured();
  const showLoading = !mounted || loading;
  const showError = mounted && !loading && error;
  const showConfigurator = mounted && !loading && !error && catalog;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
        <ConfiguratorHeader />

        {showDemoBanner && (
          <div className="shrink-0 border-b border-amber-200/20 bg-amber-950/40 px-5 py-2 text-center">
            <p className="text-[11px] text-amber-400/90">
              API niedostępne — wyświetlane są dane demo. Uruchom backend
              FastAPI i ustaw NEXT_PUBLIC_API_URL w .env.{" "}
              <Link href="/admin" className="underline hover:text-amber-300">
                Panel admina
              </Link>
            </p>
          </div>
        )}

        {showLoading && <LoadingView />}

        {showError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#1a1a1a] px-6 text-center">
            <p className="max-w-md text-sm text-[#ff6b6b]">{error}</p>
            <Link
              href="/admin"
              className="rounded-lg bg-[#ff3131] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#e02020]"
            >
              Przejdź do panelu admina
            </Link>
          </div>
        )}

        {showConfigurator && (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <ConfiguratorSidebar
              catalog={catalog}
              selection={selection}
              activeTab={activeTab}
              onSelect={setSelection}
              onTabChange={setActiveTab}
            />

            <section className="min-h-[360px] flex-1 overflow-hidden">
              <FencePreview catalog={catalog} selection={selection} />
            </section>
          </div>
        )}
    </div>
  );
}
