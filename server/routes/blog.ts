import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// GET /api/blog/posts - List all blog posts
router.get("/posts", async (req, res) => {
    try {
        const posts = await storage.getBlogPosts();
        res.json(Array.isArray(posts) ? posts : []);
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        res.status(500).json({ message: "Failed to fetch blog posts" });
    }
});

// GET /api/blog/posts/:slug - Get single blog post
router.get("/posts/:slug", async (req, res) => {
    try {
        const post = await storage.getBlogPost(req.params.slug);
        if (!post) {
            return res.status(404).json({ message: "Blog post not found" });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch blog post" });
    }
});

// HEAD /api/blog/posts - Health check for posts
router.head("/posts", async (_req, res) => {
    try {
        // Touch the storage to ensure it is healthy
        await storage.getBlogPosts();
        res.setHeader("Cache-Control", "max-age=60, must-revalidate");
        res.status(204).end();
    } catch (_err) {
        res.status(500).end();
    }
});

// HEAD /api/blog/posts/:slug - Health check for single post
router.head("/posts/:slug", async (req, res) => {
    try {
        const post = await storage.getBlogPost(req.params.slug);
        if (!post) {
            return res.status(404).end();
        }
        res.setHeader("Cache-Control", "max-age=60, must-revalidate");
        res.status(204).end();
    } catch (_err) {
        res.status(500).end();
    }
});

export default router;
