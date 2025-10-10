import { useState } from "react";

export default function Verify() {
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setStatus("error");
        setMessage(json?.error || "Verification failed");
        return;
      }
      setStatus("success");
      setMessage("You're signed in.");
    } catch {
      setStatus("error");
      setMessage("Unexpected error");
    }
  }

  return (
    <main className="container mx-auto max-w-md p-4">
      <h1 className="text-2xl font-semibold mb-4">Verify code</h1>
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
        <label className="block">
          <span className="block text-sm font-medium">Code</span>
          <input
            type="text"
            name="code"
            required
            pattern="\\d{6,8}"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="123456"
            aria-label="Code"
          />
        </label>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Verifying…" : "Verify"}
        </button>
      </form>
      <div id="status" className="mt-3" aria-live="polite">
        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
