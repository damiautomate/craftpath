import './globals.css';

export const metadata = {
  title: 'Craftpath — learn a craft, build a business',
  description: 'A guided, content-as-data learning platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="bright">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
