import './globals.css';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';

const display = Fraunces({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-display', display: 'swap' });
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Craftpath — learn a craft, build a business',
  description: 'A guided, content-as-data learning platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="bright" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
