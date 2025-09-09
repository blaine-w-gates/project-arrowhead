export const onRequestGet = async ({ request, params, env }: { request: Request; params: Record<string, string>; env: { ASSETS?: { fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response> } } }) => {
  try {
    const slug = params?.slug;
    if (!slug) {
      return new Response(JSON.stringify({ message: "Missing slug" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Strict-Transport-Security": "max-age=31536000; includeSubDomains" },
      });
    }

    const url = new URL(request.url);
    const assetUrl = new URL(`/data/blog/posts/${encodeURIComponent(slug)}.json`, url.origin);

    // Serve prebuilt JSON asset directly from static assets
    const res: Response = await (env?.ASSETS?.fetch
      ? env.ASSETS.fetch(assetUrl.toString())
      : fetch(assetUrl.toString()));

    if (!res || res.status === 404) {
      return new Response(JSON.stringify({ message: "Blog post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Strict-Transport-Security": "max-age=31536000; includeSubDomains" },
      });
    }

    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ message: "Failed to fetch blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Strict-Transport-Security": "max-age=31536000; includeSubDomains" },
    });
  }
};

// Lightweight HEAD for health/caching metadata
export const onRequestHead = async ({ request, params, env }: { request: Request; params: Record<string, string>; env: { ASSETS?: { fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response> } } }) => {
  try {
    const slug = params?.slug;
    if (!slug) {
      return new Response(null, { status: 400, headers: { "X-Content-Type-Options": "nosniff", "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } });
    }
    const url = new URL(request.url);
    const assetUrl = new URL(`/data/blog/posts/${encodeURIComponent(slug)}.json`, url.origin);
    const res: Response = await (env?.ASSETS?.fetch
      ? env.ASSETS.fetch(assetUrl.toString())
      : fetch(assetUrl.toString()));
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return new Response(null, { status: res.ok ? 204 : res.status, headers });
  } catch {
    return new Response(null, { status: 204, headers: { "X-Content-Type-Options": "nosniff", "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } });
  }
};
