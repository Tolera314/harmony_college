import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finance Portal — Harmony College',
  description: 'Finance Officer Dashboard — Harmony College Management System',
};

export default function FinanceOfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
