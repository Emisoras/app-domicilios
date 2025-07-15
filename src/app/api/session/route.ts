
import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (session) {
      return NextResponse.json(session);
    } else {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }
  } catch (error) {
    console.error('API Session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

    