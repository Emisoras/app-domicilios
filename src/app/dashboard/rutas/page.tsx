import { getOrders } from "@/actions/order-actions";
import { getUsers, getUserById } from "@/actions/user-actions";
import { RoutePlanner } from "./components/route-planner";
import type { Order } from "@/types";
import { getClients } from "@/actions/client-actions";
import { getPharmacySettings } from "@/actions/pharmacy-settings-actions";
import { geocodeAddress } from "@/ai/flows/geocode-address-flow";
import { getSession } from "@/lib/auth";

const groupOrdersByDeliveryPerson = (orders: Order[]): Record<string, Order[]> => {
    const assignedOrders = orders.filter(o => (o.status === 'in_transit' || o.status === 'assigned') && o.assignedTo);

    return assignedOrders.reduce<Record<string, Order[]>>((acc, order) => {
        const personId = order.assignedTo!.id;
        if (!acc[personId]) {
            acc[personId] = [];
        }
        acc[personId].push(order);
        // The sorting will happen inside the route planner after optimization
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

  let pharmacyLocation = {
    address: pharmacySettings.address,
    lat: 4.60971, // Default to Bogotá if geocoding fails
    lng: -74.08175,
  };

  try {
    const coords = await geocodeAddress({ address: pharmacySettings.address });
    pharmacyLocation = { ...pharmacyLocation, ...coords };
  } catch (error) {
    console.warn("Could not geocode pharmacy address, using default location. Error:", error);
  }

  const pendingOrders = allOrders
    .filter(o => o.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
  const assignedRoutes = groupOrdersByDeliveryPerson(allOrders);

  return (
    <RoutePlanner 
      initialPendingOrders={pendingOrders}
      initialAssignedRoutes={assignedRoutes}
      deliveryPeople={deliveryPeople}
      clients={clients}
      agent={agentUser}
      pharmacyAddress={{ address: pharmacySettings.address, lat: pharmacyLocation.lat, lng: pharmacyLocation.lng }}
      pharmacyLocation={pharmacyLocation}
    />
  );
}
