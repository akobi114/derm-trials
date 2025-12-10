import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://dermtrials.health';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/private/'], // Keep internal pages hidden
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}