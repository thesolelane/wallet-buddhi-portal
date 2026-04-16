// Social aggregator — Phase F
// Pulls social-URL hints from token metadata, then queries each configured
// provider in parallel.

import { getTokenMetadata } from "../token-service";
import { fetchTwitterMetrics, type TwitterResult } from "./twitter-provider";
import { fetchTelegramMetrics, type TelegramResult } from "./telegram-provider";

export interface SocialReport {
  ca: string;
  twitter: TwitterResult;
  telegram: TelegramResult;
  links: {
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
  };
  fetchedAt: number;
}

export async function getSocialReport(ca: string): Promise<SocialReport> {
  const meta = await getTokenMetadata(ca);
  const [twitter, telegram] = await Promise.all([
    fetchTwitterMetrics(meta.socials.twitter),
    fetchTelegramMetrics(meta.socials.telegram),
  ]);
  return {
    ca,
    twitter,
    telegram,
    links: meta.socials,
    fetchedAt: Date.now(),
  };
}
