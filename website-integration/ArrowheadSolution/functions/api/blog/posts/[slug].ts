export const onRequestGet = async ({ request, params, env }: { request: Request; params: Record<string, string>; env: any }) => {
  try {
    const slug = params?.slug;
    if (!slug) {
      return new Response(JSON.stringify({ message: "Missing slug" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const assetUrl = new URL(`/data/blog/posts/${encodeURIComponent(slug)}.json`, url.origin);

    // Serve prebuilt JSON asset directly from static assets
    const res: Response = await env.ASSETS.fetch(assetUrl.toString());

    if (!res || res.status === 404) {
      return new Response(JSON.stringify({ message: "Blog post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headers = new Headers(res.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=60");

    return new Response(res.body, { status: res.status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: "Failed to fetch blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
