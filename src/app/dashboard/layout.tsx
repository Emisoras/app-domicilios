import type { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserById } from '@/actions/user-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect('/');
  }

  const currentUser = await getUserById(session.userId as string);
  
  if (!currentUser) {
     return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <Alert variant="destructive" className="max-w-md">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error de Sesión</AlertTitle>
                <AlertDescription>
                    No se pudo encontrar la información del usuario para la sesión activa. Por favor, intenta iniciar sesión de nuevo.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar user={currentUser} />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 flex-1">
        <Header user={currentUser} />
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
