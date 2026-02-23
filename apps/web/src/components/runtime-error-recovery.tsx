"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "sl_runtime_recovery_v1";
const RECOVERY_WINDOW_MS = 60_000;

function shouldAttemptRecovery(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed")
  );
}

function recoverOnce() {
  try {
    const raw = window.sessionStorage.getItem(RECOVERY_KEY);
    const now = Date.now();
    const currentUrl = window.location.href;

    if (raw) {
      const previous = JSON.parse(raw) as { url?: string; at?: number };
      const sameUrl = previous.url === currentUrl;
      const recent =
        typeof previous.at === "number" &&
        now - previous.at < RECOVERY_WINDOW_MS;
      if (sameUrl && recent) {
        return;
      }
    }

    window.sessionStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({ url: currentUrl, at: now }),
    );
    window.location.reload();
  } catch {
    // no-op
  }
}

export function RuntimeErrorRecovery() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      const message = event.message ?? "";
      if (shouldAttemptRecovery(message)) {
        recoverOnce();
      }
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : (event.reason?.message ?? "");
      if (shouldAttemptRecovery(reason)) {
        recoverOnce();
      }
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
