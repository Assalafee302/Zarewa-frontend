# Social Share Image (og-image.png)

## Required
Place an optimized social share image at `/public/og-image.png`.

## Specifications
- **Format**: PNG, WebP, or JPG
- **Dimensions**: 1200 x 630 pixels (minimum)
- **File size**: < 500KB (< 100KB recommended)
- **Content**: Zarewa ERP branding with title and tagline
- **Safe area**: Keep important content within center 1050x570px to avoid platform cropping

## Why
The `og-image.png` is used for:
- Social media sharing (Twitter, Facebook, LinkedIn, Slack)
- Rich preview in chat applications and emails
- Search engine result previews
- Referenced in `index.html` meta tags:
  - `og:image`
  - `twitter:image`

## How to Create
1. **Using online tools**: Canva, Figma, or Photoshop
2. **Template**: Use Zarewa ERP branding colors (#134e4a, #f4f6f5)
3. **Include**:
   - Zarewa logo
   - Text: "Zarewa ERP"
   - Tagline: "Enterprise Resource Planning System"
   - Company colors and typography

## Optimization
After creating, optimize the image:

```bash
# Using ImageOptim, TinyPNG, or similar tools
# Target: reduce file size while maintaining quality
```

Save the final image as `public/og-image.png` and it will be automatically copied to `dist/` on build.
