"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAX_CONCURRENT_CALLS,
  DEFAULT_CALLS_PER_MINUTE,
  DEFAULT_RETRY_ATTEMPTS,
} from "@xai-calling/shared";

interface Agent {
  id: string;
  name: string;
  voice: string;
}

interface ContactList {
  id: string;
  name: string;
  contactCount: number;
}

interface FormData {
  name: string;
  agentId: string;
  contactListId: string;
  maxConcurrentCalls: number;
  callsPerMinute: number;
  retryAttempts: number;
  callerIdNumber: string;
}

const STEPS = ["Campaign Name", "Select Agent", "Select Contact List", "Settings & Review"];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    agentId: "",
    contactListId: "",
    maxConcurrentCalls: DEFAULT_MAX_CONCURRENT_CALLS ?? 3,
    callsPerMinute: DEFAULT_CALLS_PER_MINUTE ?? 2,
    retryAttempts: DEFAULT_RETRY_ATTEMPTS ?? 2,
    callerIdNumber: "",
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get<{ agents: Agent[] }>("/api/agents");
      return res.agents;
    },
    enabled: currentStep >= 2,
  });

  const { data: contactLists } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: async () => {
      const res = await api.get<{ lists: ContactList[] }>("/api/contact-lists");
      return res.lists;
    },
    enabled: currentStep >= 3,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post<{ id: string }>("/api/campaigns", data),
    onSuccess: (result) => {
      toast.success("Campaign created successfully");
      router.push(result?.id ? `/dashboard/campaigns/${result.id}` : "/dashboard/campaigns");
    },
    onError: () => {
      toast.error("Failed to create campaign");
    },
  });

  function canProceed(): boolean {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.agentId.length > 0;
      case 3:
        return formData.contactListId.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  function handleCreate() {
    createMutation.mutate(formData);
  }

  const selectedAgent = agents?.find((a) => a.id === formData.agentId);
  const selectedContactList = contactLists?.find((c) => c.id === formData.contactListId);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Create Campaign</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((label, idx) => {
          const step = idx + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {step}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-xs text-center whitespace-nowrap",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-1rem]",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Campaign Name</h2>
            <p className="text-sm text-muted-foreground">
              Give your campaign a descriptive name.
            </p>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Summer Outreach 2025"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Select Agent</h2>
            <p className="text-sm text-muted-foreground">
              Choose the AI agent that will handle calls for this campaign.
            </p>
            {!agents ? (
              <div className="h-24 rounded-lg bg-muted animate-pulse" />
            ) : agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No agents available.{" "}
                <Link href="/dashboard/agents/new" className="text-primary hover:underline">
                  Create one first
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, agentId: agent.id })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left",
                      formData.agentId === agent.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <div>
                      <p className="font-medium text-foreground">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">Voice: {agent.voice}</p>
                    </div>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border-2",
                        formData.agentId === agent.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Select Contact List</h2>
            <p className="text-sm text-muted-foreground">
              Choose the contact list to call in this campaign.
            </p>
            {!contactLists ? (
              <div className="h-24 rounded-lg bg-muted animate-pulse" />
            ) : contactLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contact lists available.{" "}
                <Link href="/dashboard/contacts" className="text-primary hover:underline">
                  Import contacts first
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {contactLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, contactListId: list.id })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left",
                      formData.contactListId === list.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <div>
                      <p className="font-medium text-foreground">{list.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {list.contactCount} contact{list.contactCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border-2",
                        formData.contactListId === list.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Max Concurrent Calls
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.maxConcurrentCalls}
                    onChange={(e) =>
                      setFormData({ ...formData, maxConcurrentCalls: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Calls Per Minute
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.callsPerMinute}
                    onChange={(e) =>
                      setFormData({ ...formData, callsPerMinute: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={formData.retryAttempts}
                    onChange={(e) =>
                      setFormData({ ...formData, retryAttempts: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Caller ID Number
                  </label>
                  <input
                    type="text"
                    value={formData.callerIdNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, callerIdNumber: e.target.value })
                    }
                    placeholder="+1234567890"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Review */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Review</h2>
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign Name</span>
                  <span className="font-medium text-foreground">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="font-medium text-foreground">
                    {selectedAgent?.name ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact List</span>
                  <span className="font-medium text-foreground">
                    {selectedContactList?.name ?? "-"}
                    {selectedContactList && (
                      <span className="text-muted-foreground ml-1">
                        ({selectedContactList.contactCount} contacts)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concurrent Calls</span>
                  <span className="font-medium text-foreground">
                    {formData.maxConcurrentCalls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calls / Min</span>
                  <span className="font-medium text-foreground">
                    {formData.callsPerMinute}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retry Attempts</span>
                  <span className="font-medium text-foreground">
                    {formData.retryAttempts}
                  </span>
                </div>
                {formData.callerIdNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caller ID</span>
                    <span className="font-medium text-foreground">
                      {formData.callerIdNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className={cn(
            "inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
            currentStep === 1
              ? "text-muted-foreground cursor-not-allowed"
              : "text-foreground hover:bg-muted"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending || !canProceed()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Campaign"}
          </button>
        )}
      </div>
    </div>
  );
}
