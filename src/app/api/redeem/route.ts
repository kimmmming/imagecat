import { NextRequest, NextResponse } from 'next/server';

function parseCodes() {
  const rawCodes = process.env.REDEEM_CODES || 'PET10:10,MC30-X7Q9-LP2D:30,VIP100:100';
  const entries = rawCodes
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [code, credits] = item.split(':');
      return [code?.trim().toUpperCase(), Number(credits)] as const;
    })
    .filter(([code, credits]) => Boolean(code) && Number.isFinite(credits) && credits > 0);

  return new Map(entries);
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const normalizedCode = String(code || '').trim().toUpperCase();

    if (!normalizedCode) {
      return NextResponse.json({ error: 'Missing redeem code' }, { status: 400 });
    }

    const codes = parseCodes();
    const credits = codes.get(normalizedCode);

    if (!credits) {
      return NextResponse.json({ error: 'Invalid redeem code' }, { status: 400 });
    }

    return NextResponse.json({
      code: normalizedCode,
      credits,
    });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json({ error: 'Redeem failed' }, { status: 500 });
  }
}
