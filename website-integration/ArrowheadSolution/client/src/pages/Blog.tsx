import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { BlogPost } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

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
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">Strategic Insights Blog</h1>
          <p className="text-xl text-muted-foreground">Expert advice on business strategy and planning</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts?.map((post) => (
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
      </div>
    </div>
  );
}
