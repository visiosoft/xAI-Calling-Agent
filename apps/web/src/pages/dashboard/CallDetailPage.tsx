import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Phone, ArrowLeft, Code, User, Bot } from "lucide-react";
import type { TranscriptEntry, ToolCallResult } from "@xai-calling/shared";

interface Call {
  id: string;
  status: string;
  outcome: string | null;
  duration: number | null;
  fromNumber: string;
  toNumber: string;
  startedAt: string | null;
  endedAt: string | null;
  campaign?: { id: string; name: string };
  transcript: TranscriptEntry[];
  toolResults?: ToolCallResult[];
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "FAILED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "IN_PROGRESS": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case "INTERESTED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "NOT_INTERESTED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "APPOINTMENT_BOOKED": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "VOICEMAIL": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "CALLBACK_REQUESTED": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CallDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id as string;

  const { data: call, isLoading } = useQuery({
    queryKey: ["calls", id],
    queryFn: async () => {
      const res = await api.get<{ call: Call }>(`/api/calls/${id}`);
      return res.call;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Phone className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Call not found</h2>
        <p className="text-muted-foreground mt-1">The call you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Phone className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
            <p className="text-sm text-muted-foreground">ID: {call.id}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Call Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span className={cn("inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(call.status))}>{formatLabel(call.status)}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outcome</p>
            {call.outcome ? (
              <span className={cn("inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium", getOutcomeColor(call.outcome))}>{formatLabel(call.outcome)}</span>
            ) : (
              <p className="text-foreground font-medium mt-1">{"—"}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-foreground font-medium mt-1">{call.duration ? formatDuration(call.duration) : "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="text-foreground font-medium mt-1">{call.fromNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">To</p>
            <p className="text-foreground font-medium mt-1">{call.toNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Started At</p>
            <p className="text-foreground font-medium mt-1">{call.startedAt ? new Date(call.startedAt).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ended At</p>
            <p className="text-foreground font-medium mt-1">{call.endedAt ? new Date(call.endedAt).toLocaleString() : "—"}</p>
          </div>
          {call.campaign && (
            <div>
              <p className="text-sm text-muted-foreground">Campaign</p>
              <p className="text-foreground font-medium mt-1">{call.campaign.name}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Transcript</h2>
        {call.transcript && call.transcript.length > 0 ? (
          <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
            {call.transcript.map((entry, index) => (
              <div key={index} className={cn("flex", entry.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-lg p-3", entry.role === "user" ? "bg-muted" : "bg-primary/10")}>
                  <div className="flex items-center gap-2 mb-1">
                    {entry.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs font-medium text-muted-foreground">{entry.role === "assistant" ? "Assistant" : "Contact"}</span>
                    {entry.timestamp && <span className="text-xs text-muted-foreground">{entry.timestamp}</span>}
                  </div>
                  <p className="text-sm text-foreground">{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No transcript available for this call.</p>
        )}
      </div>

      {call.toolResults && call.toolResults.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Tool Call Results</h2>
          </div>
          <div className="space-y-4">
            {call.toolResults.map((tool, index) => (
              <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{tool.toolName}</h3>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Arguments</p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto text-foreground">{JSON.stringify(tool.arguments, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Result</p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto text-foreground">{JSON.stringify(tool.result, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
