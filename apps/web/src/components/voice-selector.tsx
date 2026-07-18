"use client";

import { useRef, useState } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { XAI_VOICES } from "@xai-calling/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

interface VoiceSelectorProps {
  register: UseFormRegister<any>;
  errors: FieldErrors;
  fieldName?: string;
}

export function VoiceSelector({ register, errors, fieldName = "voice" }: VoiceSelectorProps) {
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "playing">("idle");
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const { ref: registerRef, ...registerRest } = register(fieldName);

  async function handlePreview() {
    const voiceId = selectRef.current?.value;
    if (!voiceId) return;

    if (previewState === "playing") {
      stopPreview();
      return;
    }

    setPreviewState("loading");
    setPreviewVoice(voiceId);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/voice-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ voice: voiceId }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to generate preview");
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPreviewState("idle");
        setPreviewVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPreviewState("idle");
        setPreviewVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setPreviewState("playing");
    } catch {
      setPreviewState("idle");
      setPreviewVoice(null);
    }
  }

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPreviewState("idle");
    setPreviewVoice(null);
  }

  function getVoiceName(voiceId: string): string {
    return XAI_VOICES.find((v) => v.id === voiceId)?.name ?? voiceId;
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldName} className="block text-sm font-medium text-foreground">
        Voice
      </label>
      <div className="flex gap-2">
        <select
          id={fieldName}
          ref={(el) => {
            registerRef(el);
            selectRef.current = el;
          }}
          {...registerRest}
          onChange={(e) => {
            registerRest.onChange(e);
            if (previewState === "playing") stopPreview();
          }}
          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {XAI_VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} — {voice.description}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewState === "loading"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0",
            previewState === "playing"
              ? "bg-destructive text-destructive-foreground hover:opacity-90"
              : "border border-border text-foreground hover:bg-muted",
            previewState === "loading" && "opacity-50 cursor-not-allowed"
          )}
        >
          {previewState === "loading" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          )}
          {previewState === "playing" && (
            <>
              <Square className="h-3.5 w-3.5" />
              Stop
            </>
          )}
          {previewState === "idle" && (
            <>
              <Play className="h-4 w-4" />
              Test Voice
            </>
          )}
        </button>
      </div>
      {previewState === "playing" && previewVoice && (
        <p className="text-xs text-muted-foreground">
          Playing {getVoiceName(previewVoice)} preview...
        </p>
      )}
      {errors[fieldName] && (
        <p className="text-sm text-destructive">
          {errors[fieldName]?.message as string}
        </p>
      )}
    </div>
  );
}
