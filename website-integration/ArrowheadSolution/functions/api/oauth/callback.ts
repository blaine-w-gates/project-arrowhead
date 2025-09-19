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
      const _msg = data.error_description || data.error || "Token exchange failed";
      return htmlCallback("error");
    }

    return htmlCallback("success", data.access_token);
  } catch (_err) {
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
        // If the OAuth flow did not open in a popup (no window.opener),
        // fall back to setting the token in localStorage and redirecting
        // back to /admin so the CMS can pick it up.
        try {
          var parsed = ${JSON.stringify({})};
          try { parsed = JSON.parse(${JSON.stringify(payload)}); } catch (e) { parsed = { token: null }; }
          var tok = parsed && parsed.token ? parsed.token : null;
          if (tok && (!window.opener || window.opener.closed)) {
            try { localStorage.setItem('netlify-cms-user', JSON.stringify({ token: tok })); } catch (e) {}
            try { window.location.replace('/admin/#/'); return; } catch (e) { /* ignore */ }
          }
        } catch (e) {}
        // Send a ready signal first (legacy Decap handshake), then repeatedly
        // post the final message for a few seconds to avoid race conditions.
        function sendFinal() {
          try { window.opener && window.opener.postMessage('authorization:github:${status}:${payload}', '*'); } catch (e) {}
        }
        try { window.opener && window.opener.postMessage('authorizing:github', '*'); } catch (e) {}
        // Fire immediately and schedule a few retries
        sendFinal();
        setTimeout(sendFinal, 150);
        var attempts = 0; var maxAttempts = 10; // ~3s total with 300ms interval
        var iv = setInterval(function(){ attempts++; sendFinal(); if (attempts >= maxAttempts) clearInterval(iv); }, 300);
        // Close after retries to allow delivery
        setTimeout(function(){ try { window.close(); } catch (e) {} }, 4000);
      })();
    </script>
    <p>Completing authorization...</p>
  </body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      // Allow only inline script present in this document, disallow all external loads
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
    },
  });
}

export const onRequestHead = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
      "Allow": "GET, HEAD",
    },
  });
};

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
