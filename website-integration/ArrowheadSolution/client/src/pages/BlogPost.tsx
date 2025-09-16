import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Share2 } from "lucide-react";
import { format } from "date-fns";
import type { BlogPost } from "@shared/schema";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Helmet } from "react-helmet-async";
import TableOfContents, { type TocHeading } from "@/components/blog/TableOfContents";

export default function BlogPost() {
  const { slug } = useParams();
  const slugReady = typeof slug === "string" && slug.length > 0;
  
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts", slug],
    enabled: slugReady,
  });
  const { data: allPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

  // Hooks must be declared unconditionally before any early returns
  const [contentHtml, setContentHtml] = useState<string>("");
  const [toc, setToc] = useState<TocHeading[]>([]);

  // Convert Markdown to HTML and sanitize to prevent XSS
  const safeHtml = useMemo(() => {
    const parsed = marked.parse(post?.content || "");
    const html = typeof parsed === "string" ? parsed : "";
    return DOMPurify.sanitize(html);
  }, [post?.content]);

  // Build ToC and ensure headings (h2/h3) have stable IDs; render final HTML string
  useEffect(() => {
    const container = document.createElement("div");
    container.innerHTML = safeHtml;
    const headings = Array.from(container.querySelectorAll("h2, h3"));
    const newToc: TocHeading[] = headings.map((el) => {
      const depth = el.tagName.toLowerCase() === "h2" ? 2 : 3;
      const text = (el.textContent || "").trim();
      const id = el.getAttribute("id") || slugify(text);
      el.setAttribute("id", id);
      return { id, text, depth: depth as 2 | 3 };
    });
    setToc(newToc);
    setContentHtml(container.innerHTML);
  }, [safeHtml]);

  // Previous/Next navigation from the post list (sorted desc by publishedAt)
  const { prev, next } = useMemo(() => {
    if (!allPosts || !post) return { prev: null as BlogPost | null, next: null as BlogPost | null };
    const idx = allPosts.findIndex((p) => p.slug === post.slug);
    const newer = idx > 0 ? allPosts[idx - 1] : null; // previous button points to older; next to newer
    const older = idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null;
    return { prev: older, next: newer };
  }, [allPosts, post]);

  if (!slugReady || isLoading || (!post && !error)) {
    return (
      <div className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xl text-muted-foreground">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Article Not Found</h1>
            <p className="text-xl text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SEO meta
  const canonicalUrl = (typeof window !== "undefined")
    ? `${window.location.origin}/blog/${post.slug}`
    : `/blog/${post.slug}`;

  return (
    <div className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Helmet>
          <title>{`${post.title} | Strategic Insights Blog`}</title>
          <link rel="canonical" href={canonicalUrl} />
          {post.excerpt && <meta name="description" content={post.excerpt} />}
          <meta property="og:type" content="article" />
          <meta property="og:title" content={post.title} />
          {post.excerpt && <meta property="og:description" content={post.excerpt} />}
          <meta property="og:url" content={canonicalUrl} />
          {post.imageUrl && <meta property="og:image" content={post.imageUrl} />}
          <meta name="twitter:card" content={post.imageUrl ? "summary_large_image" : "summary"} />
          <meta name="twitter:title" content={post.title} />
          {post.excerpt && <meta name="twitter:description" content={post.excerpt} />}
          {post.imageUrl && <meta name="twitter:image" content={post.imageUrl} />}
        </Helmet>

        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
          
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <Calendar className="mr-2 h-4 w-4" />
            {post.publishedAt && format(new Date(post.publishedAt), "MMMM d, yyyy")}
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-6">{post.title}</h1>
          
          <div className="flex items-center justify-between mb-8">
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {post.imageUrl && (
          <div className="mb-8">
            <img 
              src={post.imageUrl} 
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Table of Contents */}
        <TableOfContents headings={toc} />

        <Card>
          <CardContent className="p-8">
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: contentHtml || safeHtml }} />
            </div>
          </CardContent>
        </Card>

        {/* Prev / Next navigation */}
        <div className="mt-10 flex items-center justify-between">
          <div>
            {prev && (
              <Button asChild variant="outline">
                <Link href={`/blog/${prev.slug}`}>← {prev.title}</Link>
              </Button>
            )}
          </div>
          <div>
            {next && (
              <Button asChild>
                <Link href={`/blog/${next.slug}`}>{next.title} →</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple slugify for heading IDs
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
