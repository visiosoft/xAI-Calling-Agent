"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Phone,
  PhoneOff,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  StopCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Campaign {
  id: string;
  name: string;
  status: string;
  agent: { id: string; name: string };
  contactList: { id: string; name: string };
  totalContacts: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  maxConcurrentCalls: number;
  callsPerMinute: number;
  retryAttempts: number;
  callerIdNumber?: string;
  createdAt: string;
}

interface Call {
  id: string;
  status: string;
  phoneNumber: string;
  duration: number;
  outcome?: string;
}

interface CallsResponse {
  calls: Call[];
  total: number;
  page: number;
  totalPages: number;
}

const campaignStatusStyles: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  RUNNING:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PAUSED:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const callStatusStyles: Record<string, string> = {
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FAILED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  QUEUED: "bg-muted text-muted-foreground",
  RINGING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  NO_ANSWER:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  BUSY:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0
    ? `${mins}m ${String(secs).padStart(2, "0")}s`
    : `${secs}s`;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaigns", id],
    queryFn: async () => {
      const res = await api.get<{ campaign: Campaign }>(`/api/campaigns/${id}`);
      return res.campaign;
    },
  });
  const campaign = campaignData;

  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["campaign-calls", id, page],
    queryFn: () =>
      api.get<CallsResponse>(`/api/campaigns/${id}/calls?page=${page}&limit=20`),
  });

  function invalidateCampaign() {
    queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    queryClient.invalidateQueries({ queryKey: ["campaign-calls", id] });
  }

  const launchMutation = useMutation({
    mutationFn: () => api.post(`/api/campaigns/${id}/launch`),
    onSuccess: () => {
      toast.success("Campaign launched");
      invalidateCampaign();
    },
    onError: () => toast.error("Failed to launch campaign"),
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.post(`/api/campaigns/${id}/pause`),
    onSuccess: () => {
      toast.success("Campaign paused");
      invalidateCampaign();
    },
    onError: () => toast.error("Failed to pause campaign"),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.post(`/api/campaigns/${id}/resume`),
    onSuccess: () => {
      toast.success("Campaign resumed");
      invalidateCampaign();
    },
    onError: () => toast.error("Failed to resume campaign"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/api/campaigns/${id}/cancel`),
    onSuccess: () => {
      toast.success("Campaign cancelled");
      setShowCancelConfirm(false);
      invalidateCampaign();
    },
    onError: () => toast.error("Failed to cancel campaign"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/campaigns/${id}`),
    onSuccess: () => {
      toast.success("Campaign deleted");
      router.push("/dashboard/campaigns");
    },
    onError: () => toast.error("Failed to delete campaign"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Campaign not found
        </h2>
        <Link
          href="/dashboard/campaigns"
          className="text-primary hover:underline text-sm mt-2"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  const progress =
    campaign.totalContacts > 0
      ? Math.round((campaign.completedCalls / campaign.totalContacts) * 100)
      : 0;

  const isActionPending =
    launchMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
          <span
            className={cn(
              "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
              campaignStatusStyles[campaign.status] ?? campaignStatusStyles.DRAFT
            )}
          >
            {campaign.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => launchMutation.mutate()}
              disabled={isActionPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Launch Campaign
            </button>
          )}
          {campaign.status === "RUNNING" && (
            <button
              type="button"
              onClick={() => pauseMutation.mutate()}
              disabled={isActionPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
          {campaign.status === "PAUSED" && (
            <button
              type="button"
              onClick={() => resumeMutation.mutate()}
              disabled={isActionPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}
          {(campaign.status === "COMPLETED" || campaign.status === "CANCELLED" || campaign.status === "DRAFT") && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isActionPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-destructive text-destructive rounded-lg font-medium hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          {campaign.status !== "COMPLETED" && campaign.status !== "CANCELLED" && (
            <>
              {!showCancelConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isActionPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-destructive text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <StopCircle className="h-4 w-4" />
                  Cancel
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive font-medium">Are you sure?</span>
                  <button
                    type="button"
                    onClick={() => cancelMutation.mutate()}
                    disabled={isActionPending}
                    className="px-3 py-1.5 bg-destructive text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Yes, cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted"
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Campaign info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Agent</span>
            <p className="font-medium text-foreground">{campaign.agent?.name ?? "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contact List</span>
            <p className="font-medium text-foreground">{campaign.contactList?.name ?? "-"}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {campaign.completedCalls} / {campaign.totalContacts} ({progress}%)
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Contacts</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{campaign.totalContacts}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{campaign.completedCalls}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Failed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{campaign.failedCalls}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Loader2 className="h-4 w-4" />
            <span className="text-sm">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{campaign.inProgressCalls ?? 0}</p>
        </div>
      </div>

      {/* Calls table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Calls</h2>

        {callsLoading && (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        )}

        {!callsLoading && (!callsData || callsData.calls.length === 0) && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No calls yet</p>
          </div>
        )}

        {!callsLoading && callsData && callsData.calls.length > 0 && (
          <>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Phone Number
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Duration
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Outcome
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {callsData.calls.map((call) => (
                    <tr
                      key={call.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                            callStatusStyles[call.status] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {call.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{call.phoneNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {call.outcome ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/calls/${call.id}`}
                          className="text-primary hover:underline text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {callsData.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {callsData.page} of {callsData.totalPages} ({callsData.total} calls)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(callsData.totalPages, p + 1))}
                    disabled={page >= callsData.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Campaign Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{campaign.name}&rdquo;? All associated call records will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
