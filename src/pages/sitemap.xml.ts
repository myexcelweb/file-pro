import { getCollection } from "astro:content";

export async function GET() {
  const posts = await getCollection("blog");
  const siteUrl = "https://xlreports.netlify.app";

  const urls = [
    { loc: `${siteUrl}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${siteUrl}/about`, changefreq: "monthly", priority: 0.7 },
    { loc: `${siteUrl}/contact`, changefreq: "monthly", priority: 0.7 },
    ...posts.map((post) => ({
      loc: `${siteUrl}/blog/${post.slug}/`,
      changefreq: "weekly",
      priority: 0.8,
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `
  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: { "Content-Type": "application/xml" },
  });
}
