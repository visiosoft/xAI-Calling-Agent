import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Play, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { updateAgentSchema } from "@xai-calling/shared";
import { VoiceSelector } from "@/components/voice-selector";

const formSchema = updateAgentSchema.pick({
  name: true,
  systemPrompt: true,
  voice: true,
  greeting: true,
  maxCallDuration: true,
});

type FormValues = z.infer<typeof formSchema>;

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  voice: string;
  greeting?: string;
  maxCallDuration: number;
  createdAt: string;
}

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agents", id],
    queryFn: async () => {
      const res = await api.get<{ agent: Agent }>(`/api/agents/${id}`);
      return res.agent;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (agent) {
      reset({
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        voice: agent.voice,
        greeting: agent.greeting ?? "",
        maxCallDuration: agent.maxCallDuration,
      });
    }
  }, [agent, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => api.patch(`/api/agents/${id}`, data),
    onSuccess: () => {
      toast.success("Agent updated successfully");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: () => {
      toast.error("Failed to update agent");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/agents/${id}`),
    onSuccess: () => {
      toast.success("Agent deleted");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      navigate("/dashboard/agents");
    },
    onError: () => {
      toast.error("Failed to delete agent");
    },
  });

  function onSubmit(data: FormValues) {
    updateMutation.mutate(data);
  }

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link
          to="/dashboard/agents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Agent not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Edit Agent</h1>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className={cn(
              "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary",
              errors.name && "border-destructive"
            )}
            placeholder="e.g. Sales Assistant"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-foreground">
            System Prompt
          </label>
          <textarea
            id="systemPrompt"
            rows={8}
            {...register("systemPrompt")}
            className={cn(
              "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y",
              errors.systemPrompt && "border-destructive"
            )}
            placeholder="You are a helpful sales assistant..."
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{company}}"} etc. as dynamic variables
          </p>
          {errors.systemPrompt && (
            <p className="text-sm text-destructive">{errors.systemPrompt.message}</p>
          )}
        </div>

        {/* Voice */}
        <VoiceSelector register={register} errors={errors} />

        {/* Greeting */}
        <div className="space-y-1.5">
          <label htmlFor="greeting" className="block text-sm font-medium text-foreground">
            Greeting
          </label>
          <input
            id="greeting"
            type="text"
            {...register("greeting")}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Hello! How can I help you today?"
          />
          <p className="text-xs text-muted-foreground">
            The first message the AI says when a call starts (optional)
          </p>
          {errors.greeting && (
            <p className="text-sm text-destructive">{errors.greeting.message}</p>
          )}
        </div>

        {/* Max Call Duration */}
        <div className="space-y-1.5">
          <label htmlFor="maxCallDuration" className="block text-sm font-medium text-foreground">
            Max Call Duration (seconds)
          </label>
          <input
            id="maxCallDuration"
            type="number"
            {...register("maxCallDuration", { valueAsNumber: true })}
            className={cn(
              "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary",
              errors.maxCallDuration && "border-destructive"
            )}
            min={30}
            max={1800}
          />
          {errors.maxCallDuration && (
            <p className="text-sm text-destructive">{errors.maxCallDuration.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending || !isDirty}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          <Link
            to="/dashboard/agents"
            className="px-4 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
