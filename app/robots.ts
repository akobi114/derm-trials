import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://dermtrials.health'; // CHANGE THIS to your actual domain

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/private/'], // Keep Google out of your admin area
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}