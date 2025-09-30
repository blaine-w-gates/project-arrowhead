# Content Management Guide

This project uses **GitHub's web interface** for content management. This approach is:
- ✅ 100% reliable (no custom OAuth integration)
- ✅ Simple and straightforward
- ✅ Automatically deploys changes to production
- ✅ Built-in version control and history

## How to Edit Blog Posts

### Creating a New Blog Post

1. Navigate to the blog content folder:
   ```
   https://github.com/blaine-w-gates/project-arrowhead/tree/main/website-integration/ArrowheadSolution/content/blog
   ```

2. Click **"Add file"** → **"Create new file"**

3. Name your file using this format:
   ```
   YYYY-MM-DD-your-post-title.md
   ```
   Example: `2025-09-30-my-first-post.md`

4. Add frontmatter (metadata) at the top:
   ```markdown
   ---
   title: "Your Post Title"
   date: 2025-09-30
   author: "Your Name"
   excerpt: "A brief description of your post"
   ---
   
   Your post content goes here...
   ```

5. Write your content in Markdown format

6. Click **"Commit changes"** at the bottom

7. Add a commit message (e.g., "Add new blog post about X")

8. Click **"Commit changes"** again

9. **Done!** Cloudflare Pages will automatically build and deploy your changes (~3-5 minutes)

### Editing an Existing Blog Post

1. Navigate to the blog folder (link above)

2. Click on the post you want to edit

3. Click the **pencil icon** (✏️) in the top right

4. Make your changes

5. Scroll to bottom and click **"Commit changes"**

6. Add a commit message describing what you changed

7. Click **"Commit changes"** again

8. Changes will deploy automatically

### Deleting a Blog Post

1. Navigate to the post in GitHub

2. Click the **trash icon** (🗑️) in the top right

3. Commit the deletion

## Markdown Basics

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

[Link text](https://example.com)

![Image alt text](/images/photo.jpg)

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

> Blockquote

`inline code`

\`\`\`
code block
\`\`\`
```

## Adding Images

1. Upload images to:
   ```
   website-integration/ArrowheadSolution/public/images/uploads/
   ```

2. Reference in Markdown:
   ```markdown
   ![Description](/images/uploads/your-image.jpg)
   ```

## Viewing Changes

After committing:
1. Visit the [Cloudflare Pages dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **project-arrowhead**
3. Click **"Deployments"** to see build progress
4. Once complete, visit https://project-arrowhead.pages.dev to see your changes

## Tips

- **Preview before committing**: Use GitHub's preview tab when editing
- **Use descriptive commit messages**: This helps track changes over time
- **Test links and images**: Make sure paths are correct
- **Keep backups**: GitHub automatically tracks all changes (version history)

## Need Help?

- [GitHub Markdown Guide](https://guides.github.com/features/mastering-markdown/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- Check the repository's commit history to see examples of past posts
