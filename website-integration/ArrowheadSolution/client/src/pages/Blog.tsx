import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import type { BlogPost } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

  // Client-side search + pagination (foundation)
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const filtered = useMemo(() => {
    if (!posts) return [] as BlogPost[];
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) =>
      [p.title, p.excerpt, p.slug]
        .filter(Boolean)
        .some((s) => (s || "").toLowerCase().includes(q))
    );
  }, [posts, query]);

  useEffect(() => {
    // Reset to first page on new search
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pagePosts = filtered.slice(start, start + PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Strategic Insights Blog</h1>
            <p className="text-xl text-muted-foreground mb-16">Loading articles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Strategic Insights Blog</h1>
            <p className="text-xl text-destructive mb-16">Failed to load blog posts. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Strategic Insights Blog</h1>
          <p className="text-xl text-muted-foreground">Expert advice on business strategy and planning</p>
        </div>

        {/* Search filter (placeholder foundation) */}
        <div className="max-w-2xl mx-auto mb-12">
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <Input
            id="blog-search"
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
            {query ? ` for "${query}"` : ""}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pagePosts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link href={`/blog/${post.slug}`}>
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt={post.title}
                    className="w-full h-48 object-cover hover:scale-105 transition-transform"
                  />
                )}
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {post.publishedAt && format(new Date(post.publishedAt), "MMMM d, yyyy")}
                  </p>
                  <h3 className="text-xl font-bold text-foreground mb-3 hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <span className="text-primary hover:text-primary/80 font-semibold">
                    Read More →
                  </span>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
        
        {/* Sidebar */}
        <div className="mt-16 max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Main blog content placeholder */}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg h-fit">
            <h3 className="text-xl font-bold text-foreground mb-4">Recent Posts</h3>
            <div className="space-y-4">
              {posts?.slice(0, 3).map((post) => (
                <div key={post.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <Link href={`/blog/${post.slug}`}>
                    <h4 className="font-semibold text-foreground mb-1 hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {post.publishedAt && format(new Date(post.publishedAt), "MMMM d, yyyy")}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
            
            <h3 className="text-xl font-bold text-foreground mt-8 mb-4">Categories</h3>
            <div className="space-y-2">
              <Badge variant="outline" className="mr-2">Strategy</Badge>
              <Badge variant="outline" className="mr-2">Planning</Badge>
              <Badge variant="outline" className="mr-2">Leadership</Badge>
              <Badge variant="outline" className="mr-2">Teams</Badge>
            </div>
          </div>
        </div>
        
        {/* Pagination */}
        <div className="mt-12">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={clampedPage === 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => { e.preventDefault(); if (clampedPage > 1) setPage(clampedPage - 1); }}
                />
              </PaginationItem>

              {/* Simple windowed page numbers */}
              {(() => {
                const items: JSX.Element[] = [];
                const maxButtons = 5;
                const half = Math.floor(maxButtons / 2);
                let startPage = Math.max(1, clampedPage - half);
                const endPage = Math.min(totalPages, startPage + maxButtons - 1);
                if (endPage - startPage + 1 < maxButtons) {
                  startPage = Math.max(1, endPage - maxButtons + 1);
                }
                if (startPage > 1) {
                  items.push(
                    <PaginationItem key={1}>
                      <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(1); }}>1</PaginationLink>
                    </PaginationItem>
                  );
                  if (startPage > 2) {
                    items.push(<PaginationEllipsis key="start-ellipsis" />);
                  }
                }
                for (let p = startPage; p <= endPage; p++) {
                  items.push(
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === clampedPage}
                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    items.push(<PaginationEllipsis key="end-ellipsis" />);
                  }
                  items.push(
                    <PaginationItem key={totalPages}>
                      <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(totalPages); }}>{totalPages}</PaginationLink>
                    </PaginationItem>
                  );
                }
                return items;
              })()}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={clampedPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => { e.preventDefault(); if (clampedPage < totalPages) setPage(clampedPage + 1); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
