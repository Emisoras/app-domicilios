import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsers, getUserById } from '@/actions/user-actions';
import type { User } from '@/types';
import { DeliveryPeopleList } from "./components/delivery-people-list";
import { getSession } from '@/lib/auth';

export default async function DomiciliariosPage() {
    const session = await getSession();
    const [deliveryPeople, currentUser] = await Promise.all([
        getUsers('delivery'),
        session ? getUserById(session.userId as string) : null
    ]);

    if (!currentUser) {
        return <div>Inicia sesión para ver esta página.</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestión de Domiciliarios</h1>
                    <p className="text-muted-foreground">Administra tu equipo de entrega y asigna rutas.</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Domiciliarios</CardTitle>
                    <CardDescription>
                        Aquí podrás ver, editar y añadir nuevos domiciliarios desde la base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <DeliveryPeopleList initialDeliveryPeople={deliveryPeople} currentUser={currentUser} />
                </CardContent>
            </Card>
        </div>
    );
}
