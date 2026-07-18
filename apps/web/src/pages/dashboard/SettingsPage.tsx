import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { TELEPHONY_PROVIDERS } from "@xai-calling/shared";
import { toast } from "sonner";

interface SettingsData {
  name: string;
  xaiApiKey?: string;
  telephonyProvider?: string;
  telephonyConfig?: {
    accountSid?: string;
    authToken?: string;
    phoneNumbers?: string[];
  };
  maxConcurrentCalls?: number;
}

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SettingsData>("/api/settings"),
  });

  const [orgName, setOrgName] = useState("");
  const [xaiApiKey, setXaiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [telephonyProvider, setTelephonyProvider] = useState<string>("TWILIO");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(10);

  useEffect(() => {
    if (settings) {
      setOrgName(settings.name ?? "");
      setXaiApiKey(settings.xaiApiKey ?? "");
      setTelephonyProvider(settings.telephonyProvider ?? "TWILIO");
      setAccountSid(settings.telephonyConfig?.accountSid ?? "");
      setAuthToken(settings.telephonyConfig?.authToken ?? "");
      setPhoneNumbers(settings.telephonyConfig?.phoneNumbers?.join(", ") ?? "");
      setMaxConcurrentCalls(settings.maxConcurrentCalls ?? 10);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch("/api/settings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved successfully"); },
    onError: () => toast.error("Failed to save settings"),
  });

  const updateTelephony = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/api/settings/telephony", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Telephony settings saved successfully"); },
    onError: () => toast.error("Failed to save telephony settings"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg"><Settings className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your organization and integration settings</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Organization</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Organization Name</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Your organization name" />
          </div>
          <div className="flex justify-end">
            <button onClick={() => updateSettings.mutate({ name: orgName })} disabled={updateSettings.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">xAI API Key</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">API Key</label>
            <div className="relative">
              <input type={showApiKey ? "text" : "password"} value={xaiApiKey} onChange={(e) => setXaiApiKey(e.target.value)} className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xai-..." />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Your xAI API key for Grok voice model access</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => updateSettings.mutate({ xaiApiKey })} disabled={updateSettings.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Telephony Provider</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.values(TELEPHONY_PROVIDERS).map((provider) => (
              <button key={provider} type="button" onClick={() => setTelephonyProvider(provider)} className={cn("rounded-lg border-2 p-4 text-left transition-colors", telephonyProvider === provider ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                <p className="font-medium text-foreground">{provider === "TWILIO" ? "Twilio" : "Telnyx"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{provider === "TWILIO" ? "Industry-standard cloud telephony" : "Developer-friendly SIP trunking"}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Account SID</label>
            <input type="text" value={accountSid} onChange={(e) => setAccountSid(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Enter your account SID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Auth Token</label>
            <div className="relative">
              <input type={showAuthToken ? "text" : "password"} value={authToken} onChange={(e) => setAuthToken(e.target.value)} className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Enter your auth token" />
              <button type="button" onClick={() => setShowAuthToken(!showAuthToken)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Numbers</label>
            <input type="text" value={phoneNumbers} onChange={(e) => setPhoneNumbers(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+1234567890, +0987654321" />
            <p className="text-xs text-muted-foreground mt-1.5">Comma-separated list of phone numbers to use for outbound calls</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => updateTelephony.mutate({ provider: telephonyProvider, accountSid, authToken, phoneNumbers: phoneNumbers.split(",").map((n) => n.trim()).filter(Boolean) })} disabled={updateTelephony.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Call Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Max Concurrent Calls</label>
            <div className="flex items-center gap-4">
              <input type="range" min={1} max={50} value={maxConcurrentCalls} onChange={(e) => setMaxConcurrentCalls(Number(e.target.value))} className="flex-1 accent-primary" />
              <input type="number" min={1} max={50} value={maxConcurrentCalls} onChange={(e) => { const val = Number(e.target.value); if (val >= 1 && val <= 50) setMaxConcurrentCalls(val); }} className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Maximum number of simultaneous outbound calls (1-50)</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => updateSettings.mutate({ maxConcurrentCalls })} disabled={updateSettings.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
