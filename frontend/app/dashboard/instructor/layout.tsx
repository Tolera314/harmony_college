import type { Metadata } from 'next';
import '@/src/index.css';

export const metadata: Metadata = {
  title: 'Harmony College | Instructor Portal',
  description: 'Instructor Dashboard — Harmony College Academic Information System',
};

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
