import { getOrdersByDeliveryPerson } from "@/actions/order-actions";
import { getUserById } from "@/actions/user-actions";
import { AssignedRoutesList } from "./components/assigned-routes-list";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";

export default async function MisRutasPage() {
    const session = await getSession();

    if (!session?.userId) {
        return (
             <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <p>Inicia sesión para ver tus rutas.</p>
                </CardContent>
            </Card>
        );
    }
    
    const orders = await getOrdersByDeliveryPerson(session.userId as string);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Mis Rutas Asignadas</h1>
                <p className="text-muted-foreground">Aquí puedes ver los detalles de los pedidos que debes entregar hoy.</p>
            </div>
            <AssignedRoutesList initialOrders={orders} />
        </div>
    );
}
