# Deployment & Verification Checklist

Complete this checklist before deploying to production.

## Pre-Deployment Setup

### Domain & URLs
- [ ] Purchase or verify domain (e.g., zarewa.app)
- [ ] Update canonical URL in `index.html`:
  ```html
  <link rel="canonical" href="https://your-domain.com" />
  ```
- [ ] Update sitemap.xml URLs (replace zarewa.app with your domain)
- [ ] Update llms.txt with correct URLs
- [ ] Configure VITE_API_BASE for production API

### Assets & Images
- [ ] Create social share image at `public/og-image.png` (1200x630px)
- [ ] Update og:image references in index.html if using different image
- [ ] Verify favicon.svg and zarewa-logo.png are in public folder
- [ ] Test favicon appears in browser tab

### SSL/HTTPS
- [ ] Enable HTTPS on your hosting
- [ ] Obtain SSL certificate (Let's Encrypt recommended)
- [ ] Redirect HTTP to HTTPS
- [ ] Update canonical URL to use https://

## Build Verification

### Local Build Test
```bash
npm run build          # Build production bundle
npm run preview        # Test production build locally
```

- [ ] Build completes without errors
- [ ] No warnings about missing dependencies
- [ ] verify-dist script passes

### Built Files Check
```bash
ls -la dist/
```

- [ ] index.html exists and is ~10KB
- [ ] No .map files (source maps removed)
- [ ] robots.txt present
- [ ] sitemap.xml present
- [ ] llms.txt present
- [ ] 404.html present
- [ ] manifest.webmanifest present
- [ ] .htaccess present (if using Apache)
- [ ] assets/ directory with hashed files

### HTML Content Verification
```bash
grep -i "<title>" dist/index.html
```

- [ ] Title shows "Zarewa ERP" (not "Vite" or "React")
- [ ] Meta description is present
- [ ] og:image tag points to correct image
- [ ] Canonical URL is correct domain
- [ ] No Vite references in HTML
- [ ] Structured data (JSON-LD) is present

## Deployment

### Web Server Configuration
- [ ] SPA routing fallback configured (all 404s → index.html)
- [ ] Cache headers configured:
  - [ ] Hashed assets: Cache-Control: public, max-age=31536000
  - [ ] HTML/manifest: Cache-Control: no-cache
- [ ] CORS configured for API calls
- [ ] GZIP compression enabled
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)

### API Configuration
- [ ] Backend API is running and accessible
- [ ] API CORS allows your domain
- [ ] API cookies include zarewa_csrf
- [ ] API endpoints accessible from frontend

### Testing After Deploy
1. **Browser Tests**
   ```
   - [ ] Visit https://your-domain.com
   - [ ] Page loads without errors
   - [ ] Browser tab shows "Zarewa ERP"
   - [ ] No console errors (F12 → Console)
   - [ ] No console warnings
   ```

2. **Navigation Tests**
   ```
   - [ ] Click through main routes
   - [ ] Page titles change correctly
   - [ ] Breadcrumbs display when appropriate
   - [ ] No broken links
   ```

3. **SEO Tests**
   ```
   - [ ] https://your-domain.com/robots.txt loads correctly
   - [ ] https://your-domain.com/sitemap.xml is valid XML
   - [ ] https://your-domain.com/llms.txt loads correctly
   - [ ] https://your-domain.com/manifest.webmanifest loads
   - [ ] Social preview works (test with https://metatags.io/)
   ```

4. **Error Tests**
   ```
   - [ ] Visit https://your-domain.com/this-does-not-exist
   - [ ] Custom 404 page displays
   - [ ] Disable JavaScript and page still loads with helpful message
   - [ ] Hard refresh (Ctrl+Shift+R) works correctly
   ```

5. **Mobile Tests**
   ```
   - [ ] Responsive design works on mobile (375px width)
   - [ ] Touch interactions work
   - [ ] App can be installed as PWA
   - [ ] Mobile web app displays correctly
   ```

6. **Performance Tests**
   ```
   - [ ] Lighthouse score > 90 (SEO should be 100)
   - [ ] First Contentful Paint < 2s
   - [ ] Largest Contentful Paint < 2.5s
   - [ ] Cumulative Layout Shift < 0.1
   ```

## Post-Deployment

### Search Engine Submission
- [ ] Google Search Console: Submit sitemap
- [ ] Bing Webmaster Tools: Submit sitemap
- [ ] Monitor crawl errors
- [ ] Check indexing status
- [ ] Monitor search queries

### Monitoring
- [ ] Set up error monitoring (Sentry/Rollbar)
- [ ] Monitor Core Web Vitals
- [ ] Monitor user traffic and behavior
- [ ] Check console errors daily
- [ ] Monitor API response times

### DNS & CDN (if applicable)
- [ ] Update DNS records if using CDN
- [ ] Test CDN cache headers
- [ ] Verify asset delivery from CDN
- [ ] Monitor CDN performance

### Analytics
- [ ] Google Analytics configured
- [ ] Track page views and events
- [ ] Monitor top pages and user flows
- [ ] Set up goals/conversions

## Maintenance

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Review Core Web Vitals monthly
- [ ] Update sitemap when adding new routes
- [ ] Check for console warnings/errors
- [ ] Monitor third-party script performance

### Security
- [ ] Keep dependencies updated (npm audit)
- [ ] Monitor for security vulnerabilities
- [ ] Ensure SSL certificate renews automatically
- [ ] Test HTTPS everywhere

### SEO
- [ ] Update og-image if needed
- [ ] Add new pages to sitemap
- [ ] Monitor keyword rankings
- [ ] Check for broken links (404 errors)
- [ ] Update meta descriptions for new pages

## Troubleshooting

### Common Issues

**404 Page Not Found**
- Solution: Ensure SPA fallback is configured (all non-file requests → index.html)

**Browser Tab Shows "Index" or Default Title**
- Solution: Check DocumentTitleSync is imported in App.jsx
- Verify documentTitle.js has mapping for your route

**Vite/React References Showing**
- Solution: Verify production build was run (npm run build)
- Clear browser cache and hard refresh

**Console Errors**
- Solution: Check browser console (F12 → Console)
- Look for missing assets or API errors
- Check API CORS configuration

**Social Media Preview Not Working**
- Solution: Verify og-image.png exists
- Use https://metatags.io/ to test
- Check og:image URL is publicly accessible

**Mobile App Install Not Working**
- Solution: Verify HTTPS is enabled
- Check manifest.webmanifest is valid JSON
- Ensure icon URLs are correct

## Sign-Off

- [ ] All checklist items completed
- [ ] Team lead has reviewed
- [ ] No critical errors in production
- [ ] Users can access application
- [ ] Performance meets targets

Deployed by: _______________  
Date: _______________  
Version: _______________  
