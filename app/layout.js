import './globals.css';
import Script from 'next/script';

export default function RootLayout({ children }) {
  const adsenseClient = 'ca-pub-6967261100439734';

  return (
    <html lang="en" dir="ltr">
      <head>
        <meta name="google-adsense-account" content={adsenseClient} />
      </head>
      <body>
        <Script
          id="adsense-script"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}

