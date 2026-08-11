import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony Learning Marketplace',
  description: 'Premium books, video courses, and downloadable resources curated by Harmony College faculty.',
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
