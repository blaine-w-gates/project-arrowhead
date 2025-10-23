import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type UserData = {
  id: number;
  email: string;
  subscription: {
    status: string;
  };
};

export default function Account() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [error, setError] = useState<string>("");
  const [logoutStatus, setLogoutStatus] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
        });

        if (res.status === 401) {
          // Not authenticated, redirect to sign in
          navigate("/signin", { replace: true });
          return;
        }

        if (!res.ok) {
          setError("Failed to load account information");
          setLoading(false);
          return;
        }

        const json = (await res.json()) as { success?: boolean; user?: UserData; error?: string };
        if (json.success && json.user) {
          setUser(json.user);
        } else {
          setError(json.error || "Failed to load account");
        }
      } catch (err) {
        setError("Unexpected error loading account");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [navigate]);

  async function handleLogout() {
    setLogoutStatus("loading");
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        navigate("/signin", { replace: true });
      } else {
        setError("Logout failed");
        setLogoutStatus("idle");
      }
    } catch (err) {
      setError("Unexpected error during logout");
      setLogoutStatus("idle");
    }
  }

  function handleManageBilling() {
    // TODO: Call /api/billing/portal and redirect to Stripe portal
    alert("Billing management coming soon!");
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-2xl p-4">
        <p>Loading...</p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="container mx-auto max-w-2xl p-4">
        <h1 className="text-2xl font-semibold mb-4">Account</h1>
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!user) {
    return null; // Should redirect via useEffect
  }

  return (
    <main className="container mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      
      <div className="space-y-4">
        <section className="border rounded p-4">
          <h2 className="text-lg font-medium mb-2">Profile</h2>
          <p className="text-sm text-gray-600 mb-1">Email</p>
          <p className="font-medium">{user.email}</p>
        </section>

        <section className="border rounded p-4">
          <h2 className="text-lg font-medium mb-2">Subscription</h2>
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <p className="font-medium capitalize">{user.subscription.status}</p>
          <button
            onClick={handleManageBilling}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Manage Billing
          </button>
        </section>

        <section className="border rounded p-4">
          <h2 className="text-lg font-medium mb-2">Actions</h2>
          <button
            onClick={handleLogout}
            disabled={logoutStatus === "loading"}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {logoutStatus === "loading" ? "Logging out..." : "Logout"}
          </button>
        </section>

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
