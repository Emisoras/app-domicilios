import { loginUser } from '@/actions/user-actions';
import { createSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { cedula, password } = await request.json();
    const result = await loginUser({ cedula, password });

    if (result.success && result.user) {
      // Create a session for the user
      await createSession(result.user.id, result.user.role, result.user.name, result.user.avatarUrl || '');

      return NextResponse.json({ success: true, user: result.user });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 401 });
    }
  } catch (error) {
    console.error('API Login error:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor.' }, { status: 500 });
  }
}
