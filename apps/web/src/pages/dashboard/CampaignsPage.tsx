import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  createdAt: string;
}

const statusStyles: Record<string, string> = {
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

export function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState("");

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await api.get<{ campaigns: Campaign[] }>("/api/campaigns");
      return res.campaigns;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      api.patch(`/api/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setEditCampaign(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setDeleteCampaign(null);
    },
  });

  function openEdit(campaign: Campaign) {
    setEditName(campaign.name);
    setEditCampaign(campaign);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
        </div>
        <Link
          to="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && (!campaigns || campaigns.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No campaigns yet
          </h2>
          <p className="text-muted-foreground mb-4">
            Create your first campaign to start reaching contacts.
          </p>
          <Link
            to="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      )}

      {!isLoading && campaigns && campaigns.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Agent
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Contact List
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Progress
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const progress =
                  campaign.totalContacts > 0
                    ? Math.round(
                        (campaign.completedCalls / campaign.totalContacts) * 100
                      )
                    : 0;
                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/campaigns/${campaign.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          statusStyles[campaign.status] ?? statusStyles.DRAFT
                        )}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {campaign.agent?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {campaign.contactList?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-[120px]">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {campaign.completedCalls} / {campaign.totalContacts}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/dashboard/campaigns/${campaign.id}`)
                            }
                          >
                            View Details
                          </DropdownMenuItem>
                          {campaign.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => openEdit(campaign)}>
                              <Pencil className="h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            destructive
                            disabled={campaign.status === "RUNNING"}
                            onClick={() => setDeleteCampaign(campaign)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Campaign Dialog */}
      <Dialog open={!!editCampaign} onOpenChange={() => setEditCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Campaign</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editCampaign) {
                updateMutation.mutate({
                  id: editCampaign.id,
                  data: { name: editName },
                });
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium text-foreground">Campaign Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditCampaign(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Dialog */}
      <Dialog open={!!deleteCampaign} onOpenChange={() => setDeleteCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteCampaign?.name}&rdquo;? All associated call records will also be deleted. This action cannot be undone.
              {deleteCampaign?.status === "RUNNING" && (
                <span className="block mt-2 text-destructive font-medium">
                  Running campaigns cannot be deleted. Cancel it first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteCampaign(null)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteCampaign && deleteMutation.mutate(deleteCampaign.id)}
              disabled={deleteMutation.isPending || deleteCampaign?.status === "RUNNING"}
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
