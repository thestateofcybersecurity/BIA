import type { Metadata } from 'next';
import { Fraunces, Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/nav';
import { AccountWidget } from '@/components/account-widget';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz'],
});
const body = Archivo({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'BIA · Business Impact Assessment',
  description:
    'Time-phased business impact analysis, recovery objectives, and continuity planning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="grain min-h-screen">
        <div className="relative z-10 flex min-h-screen">
          <Nav account={<AccountWidget />} />
          <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
            <div className="mx-auto max-w-6xl">{children}</div>
            <footer className="mx-auto mt-16 max-w-6xl border-t border-line/60 pt-6 text-xs text-ink/60">
              <p>
                Part of the{' '}
                <a
                  href="https://www.cybersecurityalphabetsoup.com/"
                  rel="noopener"
                  className="hover:text-accent"
                >
                  Cybersecurity Alphabet Soup ecosystem
                </a>
                .{' '}
                <a
                  href="https://www.cybersecurityalphabetsoup.com/about/"
                  rel="noopener"
                  className="hover:text-accent"
                >
                  Meet the builder
                </a>
                .
              </p>
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
