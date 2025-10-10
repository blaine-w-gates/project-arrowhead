import { useState } from "react";
import { Link } from "wouter";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setStatus("error");
        setMessage(json?.error || "Request failed");
        return;
      }
      setStatus("success");
      setMessage("Check your email for a verification code.");
    } catch {
      setStatus("error");
      setMessage("Unexpected error");
    }
  }

  return (
    <main className="container mx-auto max-w-md p-4">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <p className="mb-4">Enter your email and we'll send you a one-time code.</p>
      <form onSubmit={onSubmit} className="space-y-3" aria-describedby="status">
        <label className="block">
          <span className="block text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="you@example.com"
            aria-label="Email"
          />
        </label>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Sending…" : "Send code"}
        </button>
      </form>
      <div id="status" className="mt-3" aria-live="polite">
        {message && <p>{message}</p>}
        <p className="mt-2 text-sm">
          Already have a code? <Link href="/verify" className="underline">Verify here</Link>.
        </p>
      </div>
    </main>
  );
}
