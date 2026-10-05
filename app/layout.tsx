import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '@/components/NotificationProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Knowledge Base | SSO Auth & Review Reminders',
  description: 'Organize, review, and master your knowledge with SSO authentication and intelligent review reminders',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <SessionProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
