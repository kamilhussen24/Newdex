export const metadata = {
  title: 'Binance Payment',
  description: 'Secure payment via Binance Pay',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
