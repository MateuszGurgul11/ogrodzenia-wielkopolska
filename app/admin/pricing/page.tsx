"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyDefaultPricing,
  fetchPricingForAdmin,
  isApiConfigured,
  updatePricingSettings,
} from "@/lib/api/client";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/pricing/defaults";
import { pricingSettingsSchema } from "@/lib/pricing/validation";
import type { PricingSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminPricingPage() {
  const { user, getToken } = useAdminAuth();
  const [form, setForm] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await fetchPricingForAdmin(token);
      setForm(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = pricingSettingsSchema.parse(form);
      const token = await getToken();
      const saved = await updatePricingSettings(parsed, token);
      setForm(saved);
      setMessage("Ustawienia wyceny zostały zapisane.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyDefaults() {
    if (
      !confirm(
        "Zastosować przykładowe ceny do wszystkich wariantów w Firestore?",
      )
    ) {
      return;
    }
    setApplying(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      const result = await applyDefaultPricing(token);
      setMessage(result.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd migracji cen");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie ustawień wyceny…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Wycena</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Globalne stawki używane w kalkulatorze orientacyjnej ceny ogrodzenia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stawki bazowe</CardTitle>
          <CardDescription>
            Cena za panel i szerokość panelu. Ceny bramy i furtki ustawiasz w
            zakładce Elementy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="panelPriceNet">Cena panelu (PLN netto)</Label>
            <Input
              id="panelPriceNet"
              type="number"
              min={0}
              step={1}
              value={form.panelPriceNet}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  panelPriceNet: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="basePricePerMeterNet">
              Cena bazowa za metr bieżący (PLN netto, referencyjna)
            </Label>
            <Input
              id="basePricePerMeterNet"
              type="number"
              min={0}
              step={1}
              value={form.basePricePerMeterNet}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  basePricePerMeterNet: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="panelWidthCm">Szerokość panelu (cm)</Label>
            <Input
              id="panelWidthCm"
              type="number"
              min={50}
              max={500}
              step={1}
              value={form.panelWidthCm}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  panelWidthCm: Number(e.target.value),
                }))
              }
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {message && <p className="text-muted-foreground text-sm">{message}</p>}
          <Button onClick={handleSave} disabled={saving || !user}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz ustawienia
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Przykładowe ceny wariantów</CardTitle>
          <CardDescription>
            Uzupełnia dopłaty na panelach, kolorach, wysokościach, słupkach i
            dystansach oraz globalne stawki bazowe. Nie tworzy duplikatów —
            aktualizuje istniejące wpisy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleApplyDefaults}
            disabled={applying || !user}
          >
            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zastosuj przykładowe ceny do wszystkich wariantów
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
