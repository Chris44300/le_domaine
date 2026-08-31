"use client";

import { useState, type ReactNode } from "react";

type Status = "idle" | "saving" | "saved" | "error";

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(25);
  }
}

function StatusNote({ status, error }: { status: Status; error: string }) {
  if (status === "saved") {
    return <p className="mt-1.5 text-xs font-medium text-success">✓ Enregistré</p>;
  }
  if (status === "error") {
    return <p className="mt-1.5 text-xs font-medium text-urgent">{error}</p>;
  }
  return null;
}

/** Formulaire qui affiche une confirmation visuelle après une Server Action. */
export function ConfirmingForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
  /** Vide le formulaire après succès (utile pour les formulaires "Ajouter"). */
  resetOnSuccess?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setStatus("saving");
    try {
      await action(formData);
      setStatus("saved");
      vibrate();
      if (resetOnSuccess) form.reset();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className} aria-busy={status === "saving"}>
      {children}
      <StatusNote status={status} error={error} />
    </form>
  );
}

/** Bouton (sans champ) qui affiche une confirmation visuelle après une Server Action. */
export function ConfirmingButton({
  action,
  children,
  className,
  confirmMessage,
}: {
  action: () => Promise<void>;
  children: ReactNode;
  className?: string;
  /** Si fourni, demande confirmation (window.confirm) avant d'exécuter. */
  confirmMessage?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setStatus("saving");
    try {
      await action();
      setStatus("saved");
      vibrate();
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "saving"}
      className={className}
    >
      {status === "saved" ? "✓" : status === "error" ? "Erreur" : children}
    </button>
  );
}
