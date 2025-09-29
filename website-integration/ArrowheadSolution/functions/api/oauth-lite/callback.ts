export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code) return new Response("Missing code", { status: 400 });
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return new Response("Missing GitHub OAuth env vars", { status: 500 });

  const redirectUri = env.OAUTH_LITE_REDIRECT_URI || `${url.origin}/api/oauth-lite/callback`;

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
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = (await ghRes.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!ghRes.ok || !data.access_token) return htmlCallback("error");

    return htmlCallback("success", data.access_token);
  } catch {
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
          var parsed = ${JSON.stringify({})};
          try { parsed = JSON.parse(${JSON.stringify(payload)}); } catch (e) { parsed = { token: null }; }
          var tok = parsed && parsed.token ? parsed.token : null;
          if (tok) {
            try { localStorage.setItem('netlify-cms.user', JSON.stringify({ token: tok })); } catch (e) {}
            try { localStorage.setItem('decap-cms.user', JSON.stringify({ token: tok })); } catch (e) {}
            try { localStorage.setItem('netlify-cms-user', JSON.stringify({ token: tok })); } catch (e) {}
            try { localStorage.setItem('decap-cms:user', JSON.stringify({ token: tok })); } catch (e) {}
            try { localStorage.setItem('decap-cms-auth', JSON.stringify({ token: tok, provider: 'github' })); } catch (e) {}
          }
          // Prefer postMessage to opener; send both forms for compatibility
          function sendFinal(){
            try { window.opener && window.opener.postMessage('authorization:github:${status}', '*'); } catch(e){}
            try { window.opener && window.opener.postMessage('authorization:github:${status}:${payload}', '*'); } catch(e){}
          }
          try { window.opener && window.opener.postMessage('authorizing:github', '*'); } catch(e){}
          sendFinal(); setTimeout(sendFinal, 150);
          var i=0, iv=setInterval(function(){ i++; sendFinal(); if(i>=10) clearInterval(iv); }, 250);
          // Fallback for no-opener: redirect to admin-lite so CMS can read token from storage
          setTimeout(function(){ try { if (!window.opener || window.opener.closed) window.location.replace('/admin-lite/#/'); } catch(e){} }, 500);
          // Close soon after
          setTimeout(function(){ try { window.close(); } catch(e){} }, 3000);
        } catch (e) {}
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
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
    },
  });
}

export const onRequestHead = async () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "X-Robots-Tag": "noindex, nofollow, noarchive", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'", Allow: "GET, HEAD" } });

async function verifySignedState(env: Record<string, string>, state: string): Promise<boolean> {
  const secret = env.OAUTH_STATE_SECRET || env.GITHUB_CLIENT_SECRET;
  if (!secret) return false;
  const parts = state.split("."); if (parts.length !== 2) return false;
  const [nonce, sig] = parts; const expected = await hmacSha256Hex(secret, nonce);
  return timingSafeEqual(expected, sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0; for (let i=0;i<a.length;i++){ res |= a.charCodeAt(i) ^ b.charCodeAt(i); }
  return res === 0;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
