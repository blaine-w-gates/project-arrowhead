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
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure JSON content-type and reasonable caching
    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=60");

    return new Response(res.body, { status: res.status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: "Failed to fetch blog posts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
