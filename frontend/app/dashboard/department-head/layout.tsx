import type { Metadata } from 'next';
import '@/src/index.css';

export const metadata: Metadata = {
  title: 'Harmony College | Department Head Portal',
  description: 'Department Head Management Dashboard — Harmony College Academic Information System',
};

export default function DepartmentHeadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
