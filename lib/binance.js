// lib/binance.js
import crypto from 'crypto';

const BASE_URL = 'https://api.binance.com';

/**
 * Binance API HMAC signature তৈরি করে
 */
function sign(queryString, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

/**
 * Binance Pay Trade History fetch করে
 * Docs: GET /sapi/v1/pay/transactions
 */
export async function getPayTransactions({ startTime, endTime, limit = 100 } = {}) {
  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('BINANCE_API_KEY এবং BINANCE_SECRET_KEY .env.local-এ দিন');
  }

  const timestamp = Date.now();
  const recvWindow = 5000;

  const params = new URLSearchParams({
    timestamp,
    recvWindow,
    limit,
    ...(startTime && { startTime }),
    ...(endTime && { endTime }),
  });

  const signature = sign(params.toString(), secretKey);
  params.append('signature', signature);

  const res = await fetch(
    `${BASE_URL}/sapi/v1/pay/transactions?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await res.json();

  if (data.code !== '000000') {
    throw new Error(data.message || 'Binance API error');
  }

  return data.data || [];
}

/**
 * Specific Order ID দিয়ে transaction খোঁজে
 * Binance transactionId: যেমন 429008320967008256
 */
export async function findTransactionByOrderId(orderId) {
  // শেষ 90 দিনের transactions আনো
  // Binance API-তে direct Order ID search নেই,
  // তাই recent history-তে match করি
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  const transactions = await getPayTransactions({
    startTime: ninetyDaysAgo,
    endTime: now,
    limit: 100,
  });

  // transactionId দিয়ে match করো
  const found = transactions.find(
    (tx) => tx.transactionId === orderId || tx.transactionId === String(orderId)
  );

  return found || null;
}
