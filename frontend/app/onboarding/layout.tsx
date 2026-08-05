import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Complete Your Profile',
  description: 'Complete your student profile to unlock full access to the Harmony College portal.',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
