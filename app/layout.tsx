import './globals.css';

export const metadata = {
  title: 'Aashan ERP Web',
  description: 'Aashan & Co LLC ERP Portal'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
