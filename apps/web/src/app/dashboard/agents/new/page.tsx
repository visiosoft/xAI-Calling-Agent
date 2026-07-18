"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { createAgentSchema } from "@xai-calling/shared";
import { VoiceSelector } from "@/components/voice-selector";

const formSchema = createAgentSchema.pick({
  name: true,
  systemPrompt: true,
  voice: true,
  greeting: true,
  maxCallDuration: true,
});

type FormValues = z.output<typeof formSchema>;

export default function NewAgentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      systemPrompt: "",
      voice: "alloy",
      greeting: "",
      maxCallDuration: 300,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => api.post("/api/agents", data),
    onSuccess: () => {
      toast.success("Agent created successfully");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      router.push("/dashboard/agents");
    },
    onError: () => {
      toast.error("Failed to create agent");
    },
  });

  function onSubmit(data: FormValues) {
    createMutation.mutate(data);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      <h1 className="text-2xl font-bold text-foreground">Create Agent</h1>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name <span className="text-destructive">*</span>
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
            System Prompt <span className="text-destructive">*</span>
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
            disabled={isSubmitting || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Agent"}
          </button>
          <Link
            href="/dashboard/agents"
            className="px-4 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
