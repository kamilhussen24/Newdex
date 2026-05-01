import { redirect } from 'next/navigation'

export default function Home() {
  // Root URL-এ কেউ আসলে একটা sample page দেখাবে
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#eef2f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        maxWidth: '400px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ color: '#F0B90B', fontSize: '28px', fontWeight: '900', letterSpacing: '3px', margin: '0 0 8px' }}>
          BINANCE
        </h1>
        <p style={{ color: '#6b7280', fontSize: '15px', margin: '0' }}>
          Payment System is running.
        </p>
      </div>
    </div>
  )
}
