import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AudienceMeter — Real-Time Interactive Polling & Word Clouds',
  description: 'Ultra-lightweight, live interactive polling, word clouds, multiple choice, and open Q&A platform for 100-200+ participants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('audiencemeter_theme');
                if (saved === 'dark' || saved === 'light') {
                  document.documentElement.setAttribute('data-theme', saved);
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
