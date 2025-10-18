import * as directoryService from '$lib/services/core/directoryService';
import type { RequestHandler } from './$types';

// This is your website's public URL. Update this before deploying to production.
const siteUrl = 'https://schemas.work';

export const GET: RequestHandler = async () => {
  // Fetch all schemas and folders from the directory service
  const allItems = await directoryService.getAllItems();
  const schemas = allItems.filter((item) => item.type === 'schema');

  // Define static pages like your home/language routes
  const staticPages = ['/en', '/es', '/el'];

  const headers = {
    'Content-Type': 'application/xml',
    'Cache-Control': 'max-age=0, s-maxage=3600', // Cache for 1 hour
  };

  // Start building the XML string
  const sitemap = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset
  xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="https://www.w3.org/1999/xhtml"
  xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
  xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
>
  ${staticPages
    .map(
      (path) => `
  <url>
    <loc>${siteUrl}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `
    )
    .join('')}
  
  ${schemas
    .map((schema) => {
      // Assuming you might want language-specific URLs for schemas in the future,
      // but for now, we'll link to a generic path. You'll need a way to determine
      // the primary language of a schema to make this more robust.
      // For now, let's default to linking it under '/en/'.
      const schemaPath = `/en/schemas/${schema.id}`; // Example path structure

      return `
  <url>
    <loc>${siteUrl}${schemaPath}</loc>
    <lastmod>${new Date(schema.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
      `;
    })
    .join('')}
</urlset>`;

  return new Response(sitemap, { headers });
};
