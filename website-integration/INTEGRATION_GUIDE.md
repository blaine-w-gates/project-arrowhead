# Project Arrowhead Website Integration Guide

## 🏗️ Website Structure

```
website-integration/
├── index.html                 # Main website homepage
├── pricing.html              # Pricing page
├── blog/
│   └── index.html            # Blog homepage
├── app/                      # Free Project Arrowhead app
│   ├── index.html            # App entry point
│   ├── brainstorm_step1.html # All brainstorm steps
│   ├── choose_step1.html     # All choose steps
│   ├── objectives_step1.html # All objectives steps
│   ├── TaskListPage.html     # Task management
│   ├── main.js              # App JavaScript
│   ├── style.css            # App styles
│   ├── components/          # Reusable components
│   └── tests/               # Test files
└── shared/                   # Shared assets
    ├── css/
    │   └── main.css         # Website-wide styles
    ├── js/
    │   └── main.js          # Website-wide JavaScript
    └── images/              # Shared images
```

## 🎯 Integration Strategy

### 1. **Subfolder Approach** (Recommended)
- **Main website** at root level (`/`)
- **Free app** at `/app/` subfolder
- **Blog** at `/blog/` subfolder
- **Shared assets** at `/shared/` for consistency

### 2. **Benefits of This Structure**
- ✅ **SEO-friendly**: Each section has its own URL structure
- ✅ **Easy deployment**: Can deploy entire folder to any web server
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Scalable**: Easy to add new sections (docs, support, etc.)

## 🔧 Implementation Steps

### Step 1: Copy Current App
```bash
# Already completed - app files are in /app/ subfolder
cp -r *.html *.js *.css components/ tests/ website-integration/app/
```

### Step 2: Update App Navigation
The app's navigation needs to be updated to integrate with the main website:

**Current app navigation:**
```html
<a class="navbar-brand" href="index.html">Project Arrowhead</a>
```

**Updated app navigation:**
```html
<a class="navbar-brand" href="../index.html">Project Arrowhead</a>
<div class="navbar-nav ms-auto">
    <a class="nav-link" href="../index.html">Main Site</a>
    <a class="nav-link" href="../pricing.html">Pricing</a>
    <a class="nav-link" href="../blog/index.html">Blog</a>
</div>
```

### Step 3: Update Asset Paths
All relative paths in the app need to be updated:

**CSS/JS imports in app pages:**
```html
<!-- Keep app-specific styles -->
<link href="style.css" rel="stylesheet">
<script src="main.js"></script>

<!-- Add shared website styles -->
<link href="../shared/css/main.css" rel="stylesheet">
<script src="../shared/js/main.js"></script>
```

### Step 4: Create Consistent Navigation
All pages should have consistent navigation with:
- Home (main website)
- Free App
- Pricing
- Blog
- CTA button to try the app

## 🎨 Design Consistency

### Color Scheme
```css
:root {
    --primary-color: #0d6efd;    /* Bootstrap primary blue */
    --warning-color: #ffc107;    /* Brainstorm module */
    --info-color: #0dcaf0;       /* Choose module */
    --success-color: #198754;    /* Objectives module */
}
```

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, professional
- **CTAs**: Action-oriented, prominent

### Components
- **Cards**: Consistent shadow and border-radius
- **Buttons**: Unified styling across all pages
- **Navigation**: Same structure and behavior

## 🚀 Deployment Options

### Option 1: Static Hosting (Recommended)
- **Netlify**: Drag and drop the `website-integration` folder
- **Vercel**: Connect to GitHub repository
- **GitHub Pages**: Push to `gh-pages` branch

### Option 2: Traditional Web Hosting
- Upload `website-integration` folder contents to web root
- Ensure Python server is available for app functionality

### Option 3: CDN + Static Site
- Use AWS S3 + CloudFront
- Azure Static Web Apps
- Google Cloud Storage

## 🔗 URL Structure

```
yoursite.com/                 # Homepage
yoursite.com/pricing.html     # Pricing
yoursite.com/blog/            # Blog
yoursite.com/app/             # Free app entry
yoursite.com/app/brainstorm_step1.html  # App pages
```

## 📱 Mobile Responsiveness

All pages are built with Bootstrap 5 and are fully responsive:
- **Mobile-first design**
- **Touch-friendly navigation**
- **Optimized layouts for all screen sizes**

## 🔍 SEO Optimization

### Meta Tags (Add to all pages)
```html
<meta name="description" content="Strategic decision making tool with brainstorming, choice evaluation, and objective setting modules.">
<meta name="keywords" content="decision making, strategic thinking, brainstorming, project management">
<meta property="og:title" content="Project Arrowhead - Strategic Decision Making">
<meta property="og:description" content="Transform complex decisions into clear, actionable plans.">
<meta property="og:image" content="/shared/images/og-image.png">
```

### Structured Data
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Project Arrowhead",
  "description": "Strategic decision making tool",
  "url": "https://yoursite.com/app/",
  "applicationCategory": "BusinessApplication"
}
```

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] All navigation links work correctly
- [ ] App functionality preserved
- [ ] Responsive design on all devices
- [ ] Cross-browser compatibility
- [ ] Form submissions work
- [ ] Asset loading (CSS, JS, images)

### Automated Testing
- Keep existing app tests in `/app/tests/`
- Add website-wide integration tests
- Test navigation between sections

## 🔄 Maintenance

### Regular Updates
1. **App updates**: Modify files in `/app/` folder
2. **Website updates**: Update homepage, pricing, blog
3. **Shared assets**: Update `/shared/` for site-wide changes

### Version Control
```bash
# Recommended Git structure
git add website-integration/
git commit -m "Add integrated website structure"
git push origin main
```

## 🎯 Next Steps

1. **Review and test** the current integration
2. **Update app navigation** to link to main website
3. **Add missing assets** (images, favicons)
4. **Deploy to staging** environment
5. **Test all functionality** end-to-end
6. **Deploy to production**

## 📞 Support

For questions about this integration:
- Review the existing app documentation
- Test thoroughly before deployment
- Consider gradual rollout (staging → production)

---

**Status**: ✅ Structure created, ready for navigation updates and deployment
