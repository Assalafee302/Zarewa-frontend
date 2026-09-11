/**
 * Utilities for managing page metadata and structured data (schema.org JSON-LD).
 * Used to enhance SEO and provide better context to search engines and assistants.
 */

/**
 * Set page meta description
 */
export function setMetaDescription(description) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = description;
}

/**
 * Set Open Graph meta tags for social sharing
 */
export function setOpenGraphTags(options = {}) {
  const { title, description, image, url, type = 'website' } = options;

  if (title) {
    setMetaTag('og:title', title, 'property');
  }
  if (description) {
    setMetaTag('og:description', description, 'property');
  }
  if (image) {
    setMetaTag('og:image', image, 'property');
  }
  if (url) {
    setMetaTag('og:url', url, 'property');
  }
  setMetaTag('og:type', type, 'property');
}

/**
 * Set Twitter Card meta tags
 */
export function setTwitterCardTags(options = {}) {
  const { card = 'summary', title, description, image } = options;

  setMetaTag('twitter:card', card, 'name');
  if (title) {
    setMetaTag('twitter:title', title, 'name');
  }
  if (description) {
    setMetaTag('twitter:description', description, 'name');
  }
  if (image) {
    setMetaTag('twitter:image', image, 'name');
  }
}

/**
 * Helper to set or create meta tags
 */
function setMetaTag(name, content, attrType = 'name') {
  let meta = document.querySelector(`meta[${attrType}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attrType, name);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/**
 * Add structured data (JSON-LD) to the page
 */
export function addStructuredData(schema, id = 'page-schema') {
  let script = document.getElementById(id);
  if (script) {
    script.remove();
  }

  script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Create BreadcrumbList schema for structured navigation
 */
export function createBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.url || undefined,
    })),
  };
}

/**
 * Create FAQPage schema
 */
export function createFaqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Create Organization schema
 */
export function createOrganizationSchema(options = {}) {
  const defaults = {
    name: 'Zarewa',
    url: 'https://zarewa.app',
    logo: 'https://zarewa.app/zarewa-logo.png',
    description: 'Enterprise resource planning system for modern businesses',
  };

  const data = { ...defaults, ...options };

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    sameAs: data.sameAs || [],
  };
}

/**
 * Create WebApplication schema
 */
export function createWebApplicationSchema(options = {}) {
  const defaults = {
    name: 'Zarewa ERP',
    description: 'Enterprise resource planning system for managing sales, inventory, finance, HR, and operations',
    url: 'https://zarewa.app',
    applicationCategory: 'BusinessApplication',
  };

  const data = { ...defaults, ...options };

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: data.name,
    description: data.description,
    url: data.url,
    applicationCategory: data.applicationCategory,
    screenshot: data.screenshot || 'https://zarewa.app/og-image.png',
  };
}

/**
 * Reset page metadata to defaults
 */
export function resetPageMetadata() {
  setMetaDescription('Zarewa ERP: Enterprise resource planning system');
  setOpenGraphTags({
    title: 'Zarewa ERP',
    description: 'Enterprise resource planning system for modern businesses',
    image: 'https://zarewa.app/og-image.png',
  });
  setTwitterCardTags({
    title: 'Zarewa ERP',
    description: 'Enterprise resource planning system',
    image: 'https://zarewa.app/og-image.png',
  });
}
