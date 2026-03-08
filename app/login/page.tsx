"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const params = useSearchParams();
  const error  = params.get("error");

  return (
    <div style={{
      minHeight: "100vh", background: "var(--void)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display), sans-serif", padding: 16,
      position: "relative", zIndex: 10,
    }}>
      <div style={{
        background: "var(--glass)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--frost)",
        borderRadius: 4, padding: "48px 40px", maxWidth: 400, width: "100%",
        textAlign: "center",
      }}>
        <div style={{ height: 2, background: "var(--acid)", marginBottom: 32, opacity: 0.5 }} />

        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, letterSpacing: "0.15em", color: "var(--ash)", textTransform: "uppercase", marginBottom: 8 }}>
          SYSTEM_AUTH_V2
        </div>

        <h1 style={{
          fontFamily: "var(--font-display), sans-serif", fontSize: 42,
          fontWeight: 700, color: "var(--acid)", textTransform: "uppercase",
          letterSpacing: "-0.02em", lineHeight: 0.85, marginBottom: 16,
        }}>
          Directives
        </h1>

        <p style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 11,
          color: "var(--ash)", marginBottom: 32, lineHeight: 1.8,
          letterSpacing: "0.02em",
        }}>
          Sign in to access your directives<br />and sync with Google Calendar.
        </p>

        {error && (
          <div style={{
            background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 2, padding: "10px 14px", marginBottom: 20,
            fontSize: 11, color: "var(--red)", fontFamily: "var(--font-mono), monospace",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            AUTH_FAILED — Please retry.
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "14px 20px",
            background: "var(--acid)", border: "none", borderRadius: 2,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            color: "var(--void)", fontFamily: "var(--font-display), sans-serif",
            textTransform: "uppercase", letterSpacing: "0.05em",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18">
            <path fill="currentColor" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="currentColor" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="currentColor" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="currentColor" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9, color: "var(--ash)", marginTop: 24, lineHeight: 1.8,
          letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6,
        }}>
          Calendar access requested for event sync
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--void)" }} />
    }>
      <LoginContent />
    </Suspense>
  );
}
