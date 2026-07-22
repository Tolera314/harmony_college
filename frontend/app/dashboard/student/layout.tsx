import type { Metadata } from 'next';
import '@/src/index.css';

export const metadata: Metadata = {
  title: 'Harmony College | Student Dashboard',
  description: 'Official Student Information System Portal for Harmony College',
};

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
