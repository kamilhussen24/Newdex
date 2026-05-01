'use client'
// app/pay/[invoiceId]/page.jsx

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const invoiceId = params.invoiceId
  const amount = searchParams.get('amount') || '0.01'
  const currency = searchParams.get('currency') || 'USDT'

  const BINANCE_UID = process.env.NEXT_PUBLIC_BINANCE_UID || 'YOUR_UID'
  const MERCHANT_NAME = process.env.NEXT_PUBLIC_MERCHANT_NAME || 'My Shop'
  const MERCHANT_SHORT = MERCHANT_NAME.slice(0, 2).toUpperCase()

  const [orderId, setOrderId] = useState('')
  const [uiState, setUiState] = useState('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [payData, setPayData] = useState(null)

  async function handleVerify() {
    const trimmed = orderId.trim()
    if (!trimmed) {
      setUiState('error')
      setStatusMsg('Please enter your Binance Order ID')
      return
    }
    if (!/^\d{10,}$/.test(trimmed)) {
      setUiState('error')
      setStatusMsg('Invalid Order ID format')
      return
    }

    setUiState('loading')
    setStatusMsg('Verifying payment...')

    try {
      const res = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: trimmed,
          invoiceId,
          expectedAmount: amount,
          expectedCurrency: currency,
        }),
      })

      const json = await res.json()

      if (json.status === 'success') {
        setUiState('success')
        setStatusMsg('Payment Verified Successfully')
        setPayData(json.data)
      } else if (json.code === 'ORDER_DUPLICATE') {
        setUiState('duplicate')
        setStatusMsg('This Order ID is already used')
      } else {
        setUiState('error')
        setStatusMsg(json.message || 'Verification failed')
      }
    } catch {
      setUiState('error')
      setStatusMsg('Network error. Please try again.')
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text)
  }

  const bannerColor = {
    error: '#ef4444',
    duplicate: '#ef4444',
    success: '#22c55e',
    loading: '#3b82f6',
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: '#eef2f7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px 40px',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ── Top Card ── */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#fff',
        borderRadius: '20px',
        padding: '24px 20px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        marginBottom: '12px',
        textAlign: 'center',
      }}>
        {uiState !== 'idle' && (
          <div style={{
            background: bannerColor[uiState] || '#3b82f6',
            color: '#fff',
            borderRadius: '12px',
            padding: '13px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '15px',
            fontWeight: '600',
          }}>
            {uiState === 'success' && '✓'}
            {(uiState === 'error' || uiState === 'duplicate') && '✕'}
            {uiState === 'loading' && '⏳'}
            {statusMsg}
          </div>
        )}

        {/* Binance Logo */}
        <div style={{ fontSize: '32px', color: '#F0B90B' }}>◆</div>
        <div style={{
          fontSize: '24px',
          fontWeight: '900',
          color: '#F0B90B',
          letterSpacing: '3px',
        }}>BINANCE</div>
      </div>

      {/* ── Payment Details Card ── */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#fff',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        marginBottom: '12px',
      }}>
        {/* Merchant + Amount */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F0B90B',
              fontSize: '18px',
              fontWeight: '800',
            }}>
              {MERCHANT_SHORT}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#111' }}>
                {MERCHANT_NAME}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
                UID: {BINANCE_UID}
              </div>
            </div>
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '12px',
            padding: '10px 14px',
            textAlign: 'right',
          }}>
            <div style={{ fontWeight: '800', fontSize: '20px', color: '#111' }}>
              {amount} <span style={{ fontSize: '13px', color: '#16a34a' }}>{currency}</span>
            </div>
            <div style={{ color: '#9ca3af', fontSize: '11px' }}>Amount</div>
          </div>
        </div>

        {/* Binance ID Box */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Binance ID (Send To)
          </div>
          <div style={{
            background: '#f9fafb',
            border: '1.5px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: '700', fontSize: '18px', color: '#111' }}>
              {BINANCE_UID}
            </span>
            <button
              onClick={() => copy(BINANCE_UID)}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >📋</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px 16px' }}>
          {[
            'Open Binance',
            <span key="s">Tap <b>Send</b></span>,
            <span key="su">Select <b>Send to Binance User</b></span>,
            'Enter the Binance ID above',
            <span key="p">Send <b>{currency} Payment</b></span>,
            'Enter your Binance Order ID below',
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '10px',
              marginBottom: i < 5 ? '9px' : 0,
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.5',
            }}>
              <span style={{ color: '#F0B90B', fontWeight: '900', flexShrink: 0 }}>•</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Input Card / Success Card ── */}
      {uiState !== 'success' ? (
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: '#fff',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="Enter Binance Order ID"
            style={{
              width: '100%',
              padding: '15px 16px',
              borderRadius: '12px',
              border: `1.5px solid ${(uiState === 'error' || uiState === 'duplicate') ? '#fca5a5' : '#e5e7eb'}`,
              fontSize: '15px',
              marginBottom: '12px',
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f9fafb',
            }}
          />
          <button
            onClick={handleVerify}
            disabled={uiState === 'loading'}
            style={{
              width: '100%',
              padding: '16px',
              background: uiState === 'loading' ? '#9ca3af' : 'linear-gradient(135deg, #1a1a2e 0%, #0f172a 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: uiState === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            🔒 {uiState === 'loading' ? 'Verifying...' : 'Secure Payment'}
          </button>
        </div>
      ) : (
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '2px solid #86efac',
          borderRadius: '20px',
          padding: '28px 20px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(34,197,94,0.15)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803d', marginBottom: '20px' }}>
            Payment Successful
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', textAlign: 'left' }}>
            {[
              ['Order ID', payData?.orderId],
              ['Amount', `${payData?.amount} ${payData?.currency}`],
              ['Payer', payData?.payerName],
              ['Time', payData?.transactionTime ? new Date(payData.transactionTime).toLocaleString() : '-'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f3f4f6',
                fontSize: '14px',
              }}>
                <span style={{ color: '#6b7280' }}>{label}</span>
                <span style={{ fontWeight: '600', color: '#111' }}>{value || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px', color: '#9ca3af', fontSize: '12px' }}>
        🔒 Secured by Binance Pay
      </div>
    </div>
  )
}
