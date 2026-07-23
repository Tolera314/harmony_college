import type { Metadata } from 'next';
import '@/src/index.css';

export const metadata: Metadata = {
  title: 'Harmony College | Super Admin Portal',
  description: 'Super Administration Dashboard — Harmony College Management System',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
