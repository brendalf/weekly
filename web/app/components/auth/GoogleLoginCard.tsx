"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@heroui/react";
import { auth } from "../../config/firebase";

function setAuthCookie() {
  const maxAgeSeconds = 60 * 60 * 24 * 7;
  document.cookie = `weekly_auth=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

interface GoogleLoginCardProps {
  compact?: boolean;
}

export function GoogleLoginCard({ compact }: GoogleLoginCardProps = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthCookie();
      window.location.assign("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Log in"}
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Log in</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Continue with Google to access your habits and tasks.
        </p>
      </div>

      <Button
        variant="outline"
        fullWidth
        isDisabled={loading}
        isPending={loading}
        onPress={handleGoogleLogin}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground/20 text-xs">
          G
        </span>
        {loading ? "Signing in…" : "Continue with Google"}
      </Button>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      <p className="mt-6 text-xs text-foreground/40">
        By continuing, you agree to our terms and acknowledge our privacy policy.
      </p>
    </div>
  );
}
