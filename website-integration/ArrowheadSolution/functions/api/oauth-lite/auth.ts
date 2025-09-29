export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID env var", { status: 500 });
  }

  const url = new URL(request.url);
  const redirectUri = env.OAUTH_LITE_REDIRECT_URI || `${url.origin}/api/oauth-lite/callback`;
  const state = await createSignedState(env);

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "repo",
    state,
  });

  const authorizeUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    },
  });
};

export const onRequestHead = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      Allow: "GET, HEAD",
    },
  });
};

async function createSignedState(env: Record<string, string>): Promise<string> {
  const secret = env.OAUTH_STATE_SECRET || env.GITHUB_CLIENT_SECRET;
  if (!secret) throw new Error("Missing OAUTH_STATE_SECRET/GITHUB_CLIENT_SECRET for state signing");
  const nonce = crypto.randomUUID();
  const sig = await hmacSha256Hex(secret, nonce);
  return `${nonce}.${sig}`;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
