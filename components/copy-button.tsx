"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "btn btn-secondary",
  disabled,
}: {
  text: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" className={className} onClick={copy} disabled={disabled || !text}>
      {state === "copied" ? "Copied!" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
