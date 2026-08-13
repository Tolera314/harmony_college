import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Verify Email',
  description: 'Verify your email address to activate your Harmony College account.',
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
