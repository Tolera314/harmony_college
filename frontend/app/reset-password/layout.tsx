import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Harmony College | Reset Password',
  description: 'Create a new password for your Harmony College account.',
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
