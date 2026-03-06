import './globals.css';

export const metadata = {
  title: 'DraftKit',
  description: 'Draft assistant with keeper, draft, taxi rounds, and API center',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
