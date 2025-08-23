export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code) {
    return new Response("Missing code", { status: 400 });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Missing GitHub OAuth env vars", { status: 500 });
  }

  const redirectUri = env.OAUTH_REDIRECT_URI || `${url.origin}/api/oauth/callback`;

  // CSRF protection: verify HMAC-signed state (nonce.sig)
  if (!returnedState || !(await verifySignedState(env, returnedState))) {
    return htmlCallback("error");
  }

  try {
    const body = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    });

    const ghRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = (await ghRes.json()) as { access_token?: string; error?: string; error_description?: string };

    if (!ghRes.ok || !data.access_token) {
      const msg = data.error_description || data.error || "Token exchange failed";
      return htmlCallback("error");
    }

    return htmlCallback("success", data.access_token);
  } catch (err: any) {
    return htmlCallback("error");
  }
};

function htmlCallback(status: "success" | "error", token?: string) {
  const payload = JSON.stringify({ token: token ?? null });
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OAuth ${status}</title>
  </head>
  <body>
    <script>
      (function () {
        try {
          // Send the final result immediately; Decap listens for this message.
          window.opener && window.opener.postMessage('authorization:github:${status}:${payload}', '*');
        } catch (e) {}
        // Close shortly after to allow the message event to dispatch.
        setTimeout(function(){ try { window.close(); } catch (e) {} }, 50);
      })();
    </script>
    <p>Completing authorization...</p>
  </body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } });
}

async function verifySignedState(env: Record<string, string>, state: string): Promise<boolean> {
  const secret = env.OAUTH_STATE_SECRET || env.GITHUB_CLIENT_SECRET;
  if (!secret) return false;
  const parts = state.split(".");
  if (parts.length !== 2) return false;
  const [nonce, sig] = parts;
  const expected = await hmacSha256Hex(secret, nonce);
  return timingSafeEqual(expected, sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
