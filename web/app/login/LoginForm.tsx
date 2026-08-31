"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

/**
 * Connexion par CODE reçu par email (6 chiffres), pas un lien à cliquer -
 * même mécanisme que Ménage (même projet Supabase, comptes déjà existants
 * pour Chris et Mel). Un lien cliquable pose deux problèmes sur iPhone :
 * Apple Mail "Protection de la vie privée" pré-visite (et donc invalide)
 * les liens à usage unique, et une PWA installée a un stockage séparé de
 * Safari qui ouvre le lien - la session ne s'établit jamais dans l'appli.
 */
export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") ?? "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(targetEmail: string) {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email: targetEmail });
    setIsLoading(false);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    if (await sendCode(email)) setStep("code");
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setIsLoading(false);
      setError("Code incorrect ou expiré. Vérifiez les chiffres ou demandez-en un nouveau.");
      return;
    }
    // Navigation complète (pas de router.push) pour que les composants
    // serveur relisent bien la session tout juste posée dans les cookies.
    window.location.href = redirectTo;
  }

  if (step === "code") {
    return (
      <form onSubmit={handleCodeSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-center text-xl font-semibold text-foreground">
          Le Domaine
        </h1>
        <p className="text-center text-sm text-foreground/60">
          Code envoyé à <strong>{email}</strong>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Code reçu"
          autoFocus
          className="rounded-full border border-border bg-surface px-4 py-3 text-center text-lg tracking-[0.3em] text-foreground outline-none focus:border-accent"
        />
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isLoading || !code.trim()}
          className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "…" : "Se connecter"}
        </button>
        <div className="flex items-center justify-between text-xs text-foreground/60">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="underline decoration-dotted"
          >
            Changer d&apos;email
          </button>
          <button
            type="button"
            onClick={() => sendCode(email)}
            disabled={isLoading}
            className="text-accent underline decoration-dotted disabled:opacity-50"
          >
            Renvoyer le code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <h1 className="mb-2 text-center text-xl font-semibold text-foreground">
        Le Domaine
      </h1>
      <input
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Votre email"
        autoFocus
        className="rounded-full border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
      />
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isLoading ? "…" : "Recevoir mon code de connexion"}
      </button>
      <p className="text-center text-xs text-foreground/50">
        Pas de mot de passe : un code de connexion vous sera envoyé par email.
      </p>
    </form>
  );
}
