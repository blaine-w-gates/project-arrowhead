export const onRequestGet = async ({ request, env }: { request: Request; env: any }) => {
  try {
    const url = new URL(request.url);
    const assetUrl = new URL("/data/blog/posts.json", url.origin);

    // Prefer serving the prebuilt JSON asset directly from static assets
    const res: Response = await (env?.ASSETS?.fetch
      ? env.ASSETS.fetch(assetUrl.toString())
      : fetch(assetUrl.toString()));

    if (!res || res.status === 404) {
      return new Response(JSON.stringify({ message: "No blog posts found" }), {
        status: 404,
        headers: { 
          "Content-Type": "application/json", 
          "X-Content-Type-Options": "nosniff",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
        },
      });
    }

    // Ensure JSON content-type and reasonable caching
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    return new Response(res.body, { status: res.status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: "Failed to fetch blog posts" }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
      },
    });
  }
};

// Lightweight HEAD for health/caching metadata
export const onRequestHead = async ({ request, env }: { request: Request; env: any }) => {
  try {
    const url = new URL(request.url);
    const assetUrl = new URL("/data/blog/posts.json", url.origin);
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
