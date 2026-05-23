import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Caros Slide Studio',
  description: 'powered by Rübibär — Coaching-Präsentationen, CI-perfekt in Minuten.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
