// app/api/pay/verify/route.js
import { NextResponse } from 'next/server'
import { findTransactionByOrderId } from '@/lib/binance'
import { kv } from '@vercel/kv' // npm install @vercel/kv

export async function POST(request) {
  try {
    const body = await request.json()
    const { orderId, expectedAmount, expectedCurrency = 'USDT', invoiceId } = body

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

    // ── Persistent duplicate check ──
    const usedKey = `used_order:${orderId}`
    const alreadyUsed = await kv.get(usedKey)
    if (alreadyUsed) {
      return NextResponse.json({
        status: 'error',
        code: 'ORDER_DUPLICATE',
        message: 'This Order ID is already used',
      }, { status: 409 })
    }

    let transaction
    try {
      transaction = await findTransactionByOrderId(orderId.trim())
    } catch (apiErr) {
      console.error('Binance API Error:', apiErr)
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

    const paidAmount = parseFloat(transaction.amount)
    const paidCurrency = transaction.currency

    // ── Currency check ──
    if (expectedCurrency && paidCurrency !== expectedCurrency) {
      return NextResponse.json({
        status: 'error',
        message: `Currency mismatch. Required ${expectedCurrency}, received ${paidCurrency}`,
      }, { status: 400 })
    }

    // ── Amount check ──
    if (expectedAmount) {
      const required = parseFloat(expectedAmount)
      if (paidAmount < required) {
        return NextResponse.json({
          status: 'error',
          message: `Amount insufficient. Required: ${required} ${expectedCurrency}, received: ${paidAmount} ${paidCurrency}`,
        }, { status: 400 })
      }
      // Optional: exact match
      // if (Math.abs(paidAmount - required) > 0.0001) { ... }
    }

    if (paidAmount <= 0) {
      return NextResponse.json({
        status: 'error',
        message: 'This transaction is not an incoming payment',
      }, { status: 400 })
    }

    // ── Mark as used (expires after 24 hours) ──
    await kv.set(usedKey, true, { ex: 86400 })

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