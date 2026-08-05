import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Apply for Admission',
  description: 'Apply for admission to Harmony College. Create your account and start your academic journey.',
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
