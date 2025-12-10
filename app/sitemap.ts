import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // FIXED: Your actual domain
  const baseUrl = 'https://dermtrials.health';

  // 1. Fetch all active trials
  const { data: trials } = await supabase
    .from('trials')
    .select('nct_id, last_updated')
    .ilike('status', 'recruiting');

  // 2. Generate URLs for each trial
  const trialUrls = (trials || []).map((trial) => ({
    url: `${baseUrl}/trial/${trial.nct_id}`,
    lastModified: new Date(trial.last_updated || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 3. Define Static Pages
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