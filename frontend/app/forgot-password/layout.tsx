import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Forgot Password',
  description: 'Reset your Harmony College account password.',
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
