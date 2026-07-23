import type { Metadata } from 'next';
import '@/src/index.css';

export const metadata: Metadata = {
  title: 'Harmony College | HR Officer Portal',
  description: 'Human Resources Information System — Harmony College',
};

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
