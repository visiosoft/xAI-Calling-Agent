"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { XAI_VOICES } from "@xai-calling/shared";
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

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  voice: string;
  greeting?: string;
  maxCallDuration: number;
  createdAt: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get<{ agents: Agent[] }>("/api/agents");
      return res.agents;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setDeleteAgent(null);
    },
  });

  function getVoiceName(voiceId: string): string {
    const voice = XAI_VOICES.find((v) => v.id === voiceId);
    return voice?.name ?? voiceId;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Agent
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && (!agents || agents.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No agents yet
          </h2>
          <p className="text-muted-foreground mb-4">
            Create your first AI agent to start making calls.
          </p>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create Agent
          </Link>
        </div>
      )}

      {!isLoading && agents && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={cn(
                "rounded-xl border border-border bg-card p-5",
                "hover:bg-muted/50 transition-colors relative"
              )}
            >
              <div
                className="absolute top-3 right-3 z-10"
                onClick={(e) => e.preventDefault()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/dashboard/agents/${agent.id}`)
                      }
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onClick={() => setDeleteAgent(agent)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Link
                href={`/dashboard/agents/${agent.id}`}
                className="block"
              >
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getVoiceName(agent.voice)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {agent.systemPrompt}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Created {new Date(agent.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteAgent?.name}&rdquo;? This
              action cannot be undone. Agents with active campaigns cannot be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteAgent(null)}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteAgent && deleteMutation.mutate(deleteAgent.id)}
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
