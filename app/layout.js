import './globals.css';

export const metadata = {
  title: 'Floor Plan App',
  description: 'Draw and configure floor plans with wall and floor materials.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
