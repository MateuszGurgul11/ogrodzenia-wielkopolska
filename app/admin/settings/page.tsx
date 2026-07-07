"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchFeaturesForAdmin,
  isApiConfigured,
  updateFeatures,
  DEFAULT_FEATURE_SETTINGS,
} from "@/lib/api/client";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import type { FeatureSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const { user, getToken } = useAdminAuth();
  const [form, setForm] = useState<FeatureSettings>(DEFAULT_FEATURE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const data = await fetchFeaturesForAdmin(token);
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
      const token = await getToken();
      const saved = await updateFeatures(form, token);
      setForm(saved);
      setMessage("Ustawienia zostały zapisane.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie ustawień…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Ustawienia</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Globalne przełączniki dostępności bramy i furtki w konfiguratorze.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elementy otwierające</CardTitle>
          <CardDescription>
            Wyłączenie opcji ukrywa ją już w kroku wyboru zakresu produktu
            (pre-wybór) oraz w zakładce Elementy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="bramaEnabled">Brama dostępna</Label>
              <p className="text-muted-foreground text-xs">
                Pozwala konfigurować bramę wjazdową
              </p>
            </div>
            <Switch
              id="bramaEnabled"
              checked={form.bramaEnabled}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, bramaEnabled: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="furtkaEnabled">Furtka dostępna</Label>
              <p className="text-muted-foreground text-xs">
                Pozwala konfigurować furtkę panelową
              </p>
            </div>
            <Switch
              id="furtkaEnabled"
              checked={form.furtkaEnabled}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, furtkaEnabled: checked }))
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
    </div>
  );
}
