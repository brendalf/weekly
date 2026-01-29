"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../config/firebase";

function setAuthCookie() {
  const maxAgeSeconds = 60 * 60 * 24 * 7;
  document.cookie = `weekly_auth=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function GoogleLoginCard() {
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

  return (
    <div
      className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.08)" }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Log in</h2>
        <p className="mt-1 text-sm text-gray-600">
          Continue with Google to access your habits and tasks.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200">
          G
        </span>
        {loading ? "Signing in…" : "Continue with Google"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <p className="mt-6 text-xs text-gray-500">
        By continuing, you agree to our terms and acknowledge our privacy policy.
      </p>
    </div>
  );
}
