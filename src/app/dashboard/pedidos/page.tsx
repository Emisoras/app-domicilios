import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrders } from "@/actions/order-actions";
import { getUsers } from "@/actions/user-actions";
import { OrdersList } from "./components/orders-list";

export default async function PedidosPage() {
    const orders = await getOrders();
    const deliveryPeople = await getUsers('delivery');

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Gestión de Pedidos</h1>
                <p className="text-muted-foreground">Visualiza y gestiona todos los pedidos de la plataforma.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Pedidos</CardTitle>
                    <CardDescription>
                        Un listado de todos los pedidos recientes desde la base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OrdersList initialOrders={orders} deliveryPeople={deliveryPeople} />
                </CardContent>
            </Card>
        </div>
    );
}
