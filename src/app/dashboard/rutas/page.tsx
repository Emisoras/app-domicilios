

import { getOrders } from "@/actions/order-actions";
import { getUsers, getUserById } from "@/actions/user-actions";
import { RoutePlanner } from "./components/route-planner";
import type { Order } from "@/types";
import { getClients } from "@/actions/client-actions";
import { getPharmacySettings } from "@/actions/pharmacy-settings-actions";
import { getSession } from "@/lib/auth";
import type { RouteInfo } from "@/components/dashboard/map-component";

const ROUTE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-4))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];


const groupOrdersByDeliveryPerson = (orders: Order[]): Record<string, Order[]> => {
    const assignedOrders = orders.filter(o => (o.status === 'in_transit' || o.status === 'assigned') && o.assignedTo);

    return assignedOrders.reduce<Record<string, Order[]>>((acc, order) => {
        const personId = order.assignedTo!.id;
        if (!acc[personId]) {
            acc[personId] = [];
        }
        acc[personId].push(order);
        return acc;
    }, {});
};

export default async function RutasPage() {
  const session = await getSession();
  const [allOrders, deliveryPeople, clients, pharmacySettings, agentUser] = await Promise.all([
    getOrders(),
    getUsers('delivery'),
    getClients(),
    getPharmacySettings(),
    session ? getUserById(session.userId as string) : null
  ]);
  
  if (!agentUser) {
    return <div>Inicia sesión para ver esta página.</div>;
  }

  const pharmacyLocation = {
    address: pharmacySettings.address,
    lat: pharmacySettings.lat || 8.250876,
    lng: pharmacySettings.lng || -73.358425,
  };

  const pendingOrders = allOrders
    .filter(o => o.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
  const assignedRoutes = groupOrdersByDeliveryPerson(allOrders);

  const routesForMap: RouteInfo[] = Object.entries(assignedRoutes)
    .map(([personId, orders], index) => {
        const deliveryPerson = deliveryPeople.find(p => p.id === personId);

        if (!deliveryPerson) return null;
        
        const reorderedOrders = orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
        return {
            deliveryPerson,
            orders: reorderedOrders,
            color: ROUTE_COLORS[index % ROUTE_COLORS.length],
            currentLocation: deliveryPerson.currentLocation,
            bearing: deliveryPerson.bearing,
        };
    })
    .filter((r): r is RouteInfo => r !== null);


  return (
    <RoutePlanner 
      initialPendingOrders={pendingOrders}
      initialRoutesForMap={routesForMap}
      deliveryPeople={deliveryPeople}
      clients={clients}
      agent={agentUser}
      pharmacyLocation={{ lat: pharmacyLocation.lat, lng: pharmacyLocation.lng }}
    />
  );
}
