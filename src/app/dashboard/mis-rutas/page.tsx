
import { getOrdersByDeliveryPerson } from "@/actions/order-actions";
import { getPharmacySettings } from "@/actions/pharmacy-settings-actions";
import { getUserById } from "@/actions/user-actions";
import { getSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { DeliveryRouteView } from "./components/delivery-route-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';


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
    
    // Fetch all necessary data on the server
    const [initialOrders, pharmacySettings, currentUser] = await Promise.all([
        getOrdersByDeliveryPerson(session.userId),
        getPharmacySettings(),
        getUserById(session.userId),
    ]);

    if (currentUser?.role !== 'delivery') {
         return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <p>Esta sección es solo para domiciliarios.</p>
                </CardContent>
            </Card>
        );
    }

    if (!pharmacySettings?.lat || !pharmacySettings?.lng) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error de Configuración</AlertTitle>
                <AlertDescription>
                    La ubicación de la farmacia no ha sido configurada. Por favor, contacta a un administrador para que la configure desde la pestaña de Configuración.
                </AlertDescription>
            </Alert>
        )
    }

    return (
       <DeliveryRouteView
            initialOrders={initialOrders}
            pharmacyLocation={pharmacySettings}
            sessionUserId={session.userId}
       />
    );
}

    