import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsers } from '@/actions/user-actions';
import type { User } from '@/types';
import { AgentsList } from "./components/agents-list";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/actions/user-actions";

export default async function AgentesPage() {
    const session = await getSession();
    const [agents, currentUser] = await Promise.all([
        getUsers('agent'),
        session ? getUserById(session.userId as string) : null
    ]);

    if (!currentUser) {
        return <div>Inicia sesión para ver esta página.</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestión de Agentes</h1>
                    <p className="text-muted-foreground">Administra los usuarios del call center.</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Agentes</CardTitle>
                    <CardDescription>
                        Aquí podrás ver, editar y añadir nuevos agentes desde la base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <AgentsList initialAgents={agents} currentUser={currentUser} />
                </CardContent>
            </Card>
        </div>
    );
}
