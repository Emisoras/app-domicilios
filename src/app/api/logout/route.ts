import { deleteSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true, message: 'Sesión cerrada exitosamente.' });
  } catch (error) {
    console.error('API Logout error:', error);
    return NextResponse.json({ success: false, message: 'Error al cerrar sesión.' }, { status: 500 });
  }
}
