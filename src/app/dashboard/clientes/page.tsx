import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClients } from '@/actions/client-actions';
import { ClientsList } from "./components/clients-list";
import type { User } from '@/types';
import { getSession } from "@/lib/auth";
import { getUserById } from "@/actions/user-actions";

export default async function ClientesPage() {
    const session = await getSession();
    const [clients, currentUser] = await Promise.all([
        getClients(),
        session ? getUserById(session.userId as string) : null
    ]);

    if (!currentUser) {
        return <div>Inicia sesión para ver esta página.</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestión de Clientes</h1>
                    <p className="text-muted-foreground">Administra la información y el historial de tus clientes.</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Clientes</CardTitle>
                    <CardDescription>
                        Aquí podrás ver, editar y añadir nuevos clientes desde la base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <ClientsList initialClients={clients} currentUser={currentUser} />
                </CardContent>
            </Card>
        </div>
    );
}
