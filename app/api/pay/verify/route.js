// app/api/pay/verify/route.js
import { NextResponse } from 'next/server';
import { findTransactionByOrderId } from '@/lib/binance';

// Used Order ID গুলো memory-তে রাখি (production-এ Vercel KV ব্যবহার করুন)
// Vercel KV থাকলে নিচের comment section uncomment করুন
const usedOrderIds = new Set();

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, expectedAmount, expectedCurrency = 'USDT', invoiceId } = body;

    // ── Validation ──
    if (!orderId) {
      return NextResponse.json({
        status: 'error',
        message: 'Binance Order ID দিন',
      }, { status: 400 });
    }

    // Binance Order ID format check (সাধারণত 15-20 digit number)
    if (!/^\d{10,}$/.test(orderId.trim())) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid Binance Order ID format',
      }, { status: 400 });
    }

    // ── Duplicate check ──
    // In-memory (simple, resets on server restart)
    if (usedOrderIds.has(orderId)) {
      return NextResponse.json({
        status: 'error',
        code: 'ORDER_DUPLICATE',
        message: 'This Order ID is already used',
      }, { status: 409 });
    }

    // ── Vercel KV দিয়ে persistent duplicate check (recommended) ──
    /*
    const { kv } = await import('@vercel/kv');
    const alreadyUsed = await kv.get(`binance_used:${orderId}`);
    if (alreadyUsed) {
      return NextResponse.json({
        status: 'error',
        code: 'ORDER_DUPLICATE',
        message: 'This Order ID is already used',
      }, { status: 409 });
    }
    */

    // ── Binance API থেকে transaction খোঁজো ──
    let transaction;
    try {
      transaction = await findTransactionByOrderId(orderId.trim());
    } catch (apiErr) {
      console.error('Binance API Error:', apiErr.message);
      return NextResponse.json({
        status: 'error',
        message: 'Binance API connection failed. Try again.',
      }, { status: 502 });
    }

    if (!transaction) {
      return NextResponse.json({
        status: 'error',
        message: 'Order ID found হয়নি। সঠিক Order ID দিন।',
      }, { status: 404 });
    }

    // ── Amount verify (optional কিন্তু recommended) ──
    const paidAmount = parseFloat(transaction.amount);
    const paidCurrency = transaction.currency;

    if (expectedAmount) {
      const required = parseFloat(expectedAmount);
      if (paidAmount < required) {
        return NextResponse.json({
          status: 'error',
          message: `Amount মিলছে না। প্রয়োজন: ${required} ${expectedCurrency}, পাওয়া গেছে: ${paidAmount} ${paidCurrency}`,
        }, { status: 400 });
      }
    }

    // ── Positive amount check (income হতে হবে, expense না) ──
    if (paidAmount <= 0) {
      return NextResponse.json({
        status: 'error',
        message: 'এই transaction টি incoming payment নয়',
      }, { status: 400 });
    }

    // ── Mark as used ──
    usedOrderIds.add(orderId);

    // Vercel KV দিয়ে:
    /*
    await kv.set(`binance_used:${orderId}`, JSON.stringify({
      invoiceId,
      amount: paidAmount,
      currency: paidCurrency,
      payerName: transaction.payerInfo?.name,
      verifiedAt: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 30 }); // 30 দিন
    */

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
    });

  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({
      status: 'error',
      message: 'Server error. Please try again.',
    }, { status: 500 });
  }
}
