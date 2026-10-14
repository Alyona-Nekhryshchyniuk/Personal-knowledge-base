import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '@/components/NotificationProvider';
import { NotificationPanel } from '@/components/notifications';
import { Toaster } from 'sonner';
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
            <NotificationPanel />
            <Toaster
              position="top-right"
              gap={16}
              richColors={false}
              expand={false}
              visibleToasts={10}
              toastOptions={{
                style: {
                  marginTop: '16px',
                  marginRight: '16px',
                },
              }}
            />
            {children}
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
