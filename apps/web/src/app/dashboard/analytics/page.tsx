"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BarChart3, Phone, PhoneIncoming, Clock, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalCalls: number;
  answerRate: number;
  avgDuration: number;
  conversionRate: number;
  outcomes: Record<string, number>;
  campaignPerformance?: CampaignPerformance[];
}

interface CampaignPerformance {
  id: string;
  name: string;
  callsMade: number;
  answerRate: number;
  conversionRate: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const OUTCOME_COLORS: Record<string, string> = {
  INTERESTED: "bg-green-500",
  NOT_INTERESTED: "bg-red-500",
  APPOINTMENT_BOOKED: "bg-blue-500",
  VOICEMAIL: "bg-yellow-500",
  NO_ANSWER: "bg-gray-500",
  CALLBACK_REQUESTED: "bg-purple-500",
  BUSY: "bg-orange-500",
  DO_NOT_CALL: "bg-red-700",
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<AnalyticsData>("/api/analytics"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Calls",
      value: analytics?.totalCalls?.toLocaleString() ?? "0",
      icon: Phone,
    },
    {
      label: "Answer Rate",
      value: `${(analytics?.answerRate ?? 0).toFixed(1)}%`,
      icon: PhoneIncoming,
    },
    {
      label: "Avg Duration",
      value: formatDuration(analytics?.avgDuration ?? 0),
      icon: Clock,
    },
    {
      label: "Conversion Rate",
      value: `${(analytics?.conversionRate ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
    },
  ];

  const outcomes = analytics?.outcomes ?? {};
  const outcomeEntries = Object.entries(outcomes);
  const totalOutcomes = outcomeEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Outcome Breakdown */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Call Outcomes
        </h2>
        {outcomeEntries.length > 0 ? (
          <div className="space-y-3">
            {outcomeEntries
              .sort(([, a], [, b]) => b - a)
              .map(([outcome, count]) => {
                const percentage =
                  totalOutcomes > 0 ? (count / totalOutcomes) * 100 : 0;
                const barColor =
                  OUTCOME_COLORS[outcome] ?? "bg-primary";

                return (
                  <div key={outcome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {formatLabel(outcome)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No outcome data available yet.
          </p>
        )}
      </div>

      {/* Campaign Performance */}
      {analytics?.campaignPerformance && analytics.campaignPerformance.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Campaign Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                    Campaign
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    Calls Made
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    Answer Rate
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    Conversion Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.campaignPerformance.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 px-2 text-foreground font-medium">
                      {campaign.name}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground">
                      {campaign.callsMade.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground">
                      {campaign.answerRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right text-foreground">
                      {campaign.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
