import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Welcome Portal',
  description: 'Your Harmony College applicant portal. Complete your profile and explore programs.',
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
