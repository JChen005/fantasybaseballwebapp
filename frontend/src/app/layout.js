import './globals.css';

export const metadata = {
  title: 'DraftElite',
  description: 'Fantasy baseball draft assistant with keeper, draft, taxi rounds, and API center',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
