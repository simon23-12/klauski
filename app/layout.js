import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Klaus KI',
  description: 'Wissenschaftlicher Diskurs über Wirtschaftswachstum — endlich oder unendlich?',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className={`${playfair.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
