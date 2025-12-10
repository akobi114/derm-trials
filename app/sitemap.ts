import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Define your base URL (Use your real Vercel domain here later)
  // For now, we'll use a placeholder or environment variable if you have one.
  const baseUrl = 'https://dermtrials.health'; // CHANGE THIS to your actual domain eventually

  // 2. Fetch all active trials
  const { data: trials } = await supabase
    .from('trials')
    .select('nct_id, last_updated')
    .ilike('status', 'recruiting');

  // 3. Generate URLs for each trial
  const trialUrls = (trials || []).map((trial) => ({
    url: `${baseUrl}/trial/${trial.nct_id}`,
    lastModified: new Date(trial.last_updated || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 4. Define Static Pages (Home, Conditions, etc.)
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/conditions`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ];

  return [...staticPages, ...trialUrls];
}