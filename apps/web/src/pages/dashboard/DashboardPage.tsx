import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Phone, PhoneCall, CheckCircle, XCircle } from "lucide-react";

interface OverviewStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCalls: number;
  completedCalls: number;
  answerRate: number;
  avgDuration: number;
  outcomes: Record<string, number>;
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => api.get<OverviewStats>("/api/analytics/overview"),
  });

  const statCards = [
    { label: "Total Campaigns", value: stats?.totalCampaigns ?? 0, icon: Phone },
    { label: "Active Campaigns", value: stats?.activeCampaigns ?? 0, icon: PhoneCall },
    { label: "Total Calls", value: stats?.totalCalls ?? 0, icon: CheckCircle },
    { label: "Answer Rate", value: `${(stats?.answerRate ?? 0).toFixed(1)}%`, icon: XCircle },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-card-foreground">
              {isLoading ? "..." : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Getting Started</h2>
        <div className="space-y-3">
          {[
            "Go to Settings and configure your Twilio/Telnyx and xAI API keys",
            "Create an AI Agent with your custom prompt and voice",
            "Upload your Contacts via CSV or add them manually",
            "Create and launch a Campaign to start calling",
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
