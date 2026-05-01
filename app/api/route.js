import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Binance API এন্ডপয়েন্ট
const BINANCE_API_BASE = 'https://api.binance.com';

function formatTimes(timestampMs) {
  if (!timestampMs) return { utc: null, dhaka: null };
  const date = new Date(parseInt(timestampMs));
  // UTC
  const utc = date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  // Asia/Dhaka (GMT+6, কোনো DST নেই)
  const dhakaDate = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  const dhakaStr = dhakaDate.toISOString().replace('T', ' ').substring(0, 19);
  let hours = dhakaDate.getUTCHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = dhakaDate.getUTCMinutes().toString().padStart(2,'0');
  const seconds = dhakaDate.getUTCSeconds().toString().padStart(2,'0');
  const datePart = dhakaDate.toISOString().split('T')[0];
  const dhakaFormatted = `${datePart} ${hours}:${minutes}:${seconds} ${ampm} (BD Time)`;
  return { utc, dhaka: dhakaFormatted };
}

async function binanceGet(apiKey, secretKey, endpoint, params = {}) {
  params.timestamp = Date.now();
  params.recvWindow = 10000;
  const queryString = new URLSearchParams(params).toString();
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
  const url = `${BINANCE_API_BASE}${endpoint}?${queryString}&signature=${signature}`;
  const response = await fetch(url, {
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  });
  const httpCode = response.status;
  const data = await response.json();
  return { code: httpCode, data };
}

export async function GET(request) {
  const start = Date.now();

  // 1. শুধু direct=1 থাকলেই কাজ করব (অথবা যেকোনো GET-ই API রেসপন্স দেবে)
  const { searchParams } = new URL(request.url);
  const direct = searchParams.get('direct');
  if (direct !== '1') {
    // UI না থাকায় শুধু JSON ইরর দেখাতে পারি, অথবা ডকুমেন্টেশন দেখাই
    return NextResponse.json(
      { status: 'error', message: 'Use ?direct=1&amount=...&orderid=...' },
      { status: 400 }
    );
  }

  // 2. প্যারামিটার সংগ্রহ
  const amountRaw = searchParams.get('amount') || '0';
  const orderId = searchParams.get('orderid') || '';
  const bid = searchParams.get('bid') || '';

  // 3. API Key / Secret Key এনভায়রনমেন্ট ভেরিয়েবল থেকে নেওয়া হবে
  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { status: 'error', message: 'BINANCE_API_KEY or BINANCE_SECRET_KEY not set in environment' },
      { status: 500 }
    );
  }

  if (!orderId) {
    return NextResponse.json(
      { status: 'error', message: 'Order ID required' },
      { status: 400 }
    );
  }

  const amountFloat = parseFloat(amountRaw);
  if (isNaN(amountFloat) || amountFloat < 0.01) {
    return NextResponse.json(
      { status: 'error', message: 'Amount must be at least 0.01 USDT' },
      { status: 400 }
    );
  }

  // 4. Binance Pay ট্রানজেকশন তলব (গত ২৪ ঘণ্টা)
  const endTime = Date.now();
  const startTime = endTime - 24 * 60 * 60 * 1000;

  const result = await binanceGet(apiKey, secretKey, '/sapi/v1/pay/transactions', {
    startTimestamp: startTime,
    endTimestamp: endTime,
    limit: 100,
  });

  const responseTime = Date.now() - start;

  if (result.code !== 200) {
    return NextResponse.json({
      status: 'error',
      message: `Binance API Error: ${result.data?.msg || 'Unknown'}`,
      response_time_ms: responseTime,
    });
  }

  const transactions = result.data?.data || [];
  let matched = null;

  for (const tx of transactions) {
    const txAmount = parseFloat(tx.amount);
    const txOrderId = String(tx.orderId || '');
    if (txAmount > 0 && txOrderId === orderId && Math.abs(txAmount - amountFloat) < 0.005) {
      matched = tx;
      break;
    }
  }

  if (matched) {
    const payerName = matched.payerInfo?.name || matched.counterpartyId || 'Unknown';
    const payerUid = String(matched.payerInfo?.binanceId || matched.uid || matched.counterpartyId || '');
    const counterparty = String(matched.counterpartyId || '');
    const txAmount = matched.amount;
    const asset = matched.currency || 'USDT';
    const txId = matched.transactionId || '';
    const orderType = matched.orderType || 'C2C';
    const walletType = matched.walletType || null;
    const note = matched.note || '';
    const times = formatTimes(matched.transactionTime);

    return NextResponse.json({
      status: 'success',
      message: `Payment received from ${payerName}`,
      bid,
      payment: {
        amount: txAmount,
        currency: asset,
        order_id: orderId,
        transaction_id: txId,
        transaction_time_utc: times.utc,
        transaction_time_dhaka: times.dhaka,
        order_type: orderType,
        wallet_type: walletType,
        note,
      },
      payer: {
        name: payerName,
        binance_uid: payerUid,
        counterparty_id: counterparty,
      },
      meta: {
        response_time_ms: responseTime,
        server_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      },
    });
  } else {
    return NextResponse.json({
      status: 'error',
      message: 'No matching payment found in the last 24 hours. Check Order ID and amount.',
      meta: {
        response_time_ms: responseTime,
        server_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      },
    });
  }
}

// CORS প্রয়োজনে (যদি অন্য ডোমেইন থেকে কল করতে চান)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}