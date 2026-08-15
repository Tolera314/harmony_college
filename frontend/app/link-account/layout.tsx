import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Link Account',
  description: 'Verify your password to link your existing account with an OAuth provider.',
};

export default function LinkAccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
