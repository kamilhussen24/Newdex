// app/api/pay/verify/route.js
import { NextResponse } from 'next/server'
import { findTransactionByOrderId } from '@/lib/binance'

// Duplicate prevention (in-memory)
// Production-এ Vercel KV ব্যবহার করুন
const usedOrderIds = new Set()

export async function POST(request) {
  try {
    const body = await request.json()
    const { orderId, expectedAmount, expectedCurrency = 'USDT', invoiceId } = body

    // ── Validation ──
    if (!orderId) {
      return NextResponse.json({
        status: 'error',
        message: 'Binance Order ID দিন',
      }, { status: 400 })
    }

    if (!/^\d{10,}$/.test(orderId.trim())) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid Binance Order ID format',
      }, { status: 400 })
    }

    // ── Duplicate check ──
    if (usedOrderIds.has(orderId)) {
      return NextResponse.json({
        status: 'error',
        code: 'ORDER_DUPLICATE',
        message: 'This Order ID is already used',
      }, { status: 409 })
    }

    // ── Binance API থেকে transaction খোঁজো ──
    let transaction
    try {
      transaction = await findTransactionByOrderId(orderId.trim())
    } catch (apiErr) {
      console.error('Binance API Error:', apiErr.message)
      return NextResponse.json({
        status: 'error',
        message: 'Binance API connection failed. Try again.',
      }, { status: 502 })
    }

    if (!transaction) {
      return NextResponse.json({
        status: 'error',
        message: 'Order ID পাওয়া যায়নি। সঠিক Order ID দিন।',
      }, { status: 404 })
    }

    // ── Amount verify ──
    const paidAmount = parseFloat(transaction.amount)
    const paidCurrency = transaction.currency

    if (expectedAmount) {
      const required = parseFloat(expectedAmount)
      if (paidAmount < required) {
        return NextResponse.json({
          status: 'error',
          message: `Amount মিলছে না। প্রয়োজন: ${required} ${expectedCurrency}, পাওয়া গেছে: ${paidAmount} ${paidCurrency}`,
        }, { status: 400 })
      }
    }

    // ── Income check ──
    if (paidAmount <= 0) {
      return NextResponse.json({
        status: 'error',
        message: 'এই transaction incoming payment নয়',
      }, { status: 400 })
    }

    // ── Mark as used ──
    usedOrderIds.add(orderId)

    // ── Success ──
    return NextResponse.json({
      status: 'success',
      message: 'Payment Verified Successfully',
      data: {
        orderId,
        invoiceId,
        amount: paidAmount,
        currency: paidCurrency,
        orderType: transaction.orderType,
        payerName: transaction.payerInfo?.name || 'Unknown',
        transactionTime: new Date(transaction.transactionTime).toISOString(),
        verifiedAt: new Date().toISOString(),
      },
    })

  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.json({
      status: 'error',
      message: 'Server error. Please try again.',
    }, { status: 500 })
  }
}
