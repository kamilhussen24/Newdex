import crypto from 'crypto';

const BASE_URL = 'https://api.binance.com';

function sign(queryString, secretKey) {
    return crypto.createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');
}

export default async function handler(req, res) {
    // 1. Enable CORS headers (makes it easy to call from a website frontend)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // 2. Only allow GET requests for this example
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { orderId } = req.query;
    if (!orderId) {
        return res.status(400).json({ error: 'orderId query parameter is required' });
    }

    // 3. Access your API Keys from Vercel Environment Variables
    const apiKey = process.env.BINANCE_API_KEY;
    const secretKey = process.env.BINANCE_SECRET_KEY;

    if (!apiKey || !secretKey) {
        console.error('Missing API keys in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const now = Date.now();
        const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
        const limit = 100;

        const params = new URLSearchParams({
            timestamp: now.toString(),
            recvWindow: '5000',
            startTime: ninetyDaysAgo.toString(),
            endTime: now.toString(),
            limit: limit.toString(),
        });

        const signature = sign(params.toString(), secretKey);
        params.append('signature', signature);

        const url = `${BASE_URL}/sapi/v1/pay/transactions?${params.toString()}`;
        const response = await fetch(url, {
            headers: { 'X-MBX-APIKEY': apiKey }
        });

        const data = await response.json();

        if (data.code !== '000000') {
            throw new Error(data.message || 'Binance API error');
        }

        const foundTransaction = data.data.find(
            tx => tx.transactionId === orderId || tx.transactionId === String(orderId)
        );

        if (!foundTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(200).json(foundTransaction);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}