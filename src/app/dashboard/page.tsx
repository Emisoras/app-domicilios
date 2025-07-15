import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bike, DollarSign, Package, Map, ListOrdered } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDashboardStats, getOrders, getOrdersByDeliveryPerson } from "@/actions/order-actions";
import { getUsers, getUserById } from '@/actions/user-actions';
import { WeeklyRevenueChart } from "./components/weekly-revenue-chart";
import type { OrderStatus, Order, User } from "@/types";
import type { RouteInfo } from '@/components/dashboard/map-component';
import { DashboardMap } from "./components/dashboard-map";
import { getPharmacySettings } from "@/actions/pharmacy-settings-actions";
import { geocodeAddress } from "@/ai/flows/geocode-address-flow";
import { optimizePharmacyRoute } from "@/ai/flows/optimize-pharmacy-route";
import { getSession } from "@/lib/auth";

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'in_transit': return <Badge variant="accent">En Camino</Badge>;
    case 'assigned': return <Badge variant="secondary">Asignado</Badge>;
    case 'pending': return <Badge variant="outline">Pendiente</Badge>;
    case 'delivered': return <Badge variant="success">Entregado</Badge>;
    case 'cancelled': return <Badge variant="destructive">Cancelado</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

const groupOrdersByDeliveryPerson = (orders: Order[]): Record<string, Order[]> => {
    const assignedOrders = orders.filter(o => (o.status === 'in_transit' || o.status === 'assigned') && o.assignedTo);

    return assignedOrders.reduce<Record<string, Order[]>>((acc, order) => {
        if (!order.assignedTo) return acc;
        const personId = order.assignedTo.id;
        if (!acc[personId]) {
            acc[personId] = [];
        }
        acc[personId].push(order);
        acc[personId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return acc;
    }, {});
};

const ROUTE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-4))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];


export default async function DashboardPage() {
  const session = await getSession();
  const currentUser = session ? await getUserById(session.userId as string) : null;
  
  if (!currentUser) {
    // This case should ideally be handled by the layout, but as a fallback:
    return <p>Inicia sesión para ver el dashboard.</p>;
  }
  
  const isDeliveryPerson = currentUser.role === 'delivery';

  // Fetch data based on user role
  const [stats, allOrders, deliveryPeople, pharmacySettings] = await Promise.all([
    getDashboardStats(currentUser),
    isDeliveryPerson ? getOrdersByDeliveryPerson(currentUser.id) : getOrders(),
    isDeliveryPerson ? [] : getUsers('delivery'),
    getPharmacySettings(),
  ]);

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

  const pendingOrders = isDeliveryPerson
    ? [] // Delivery people don't see unassigned orders
    : allOrders
        .filter(o => o.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
  const assignedRoutes = groupOrdersByDeliveryPerson(allOrders);

  const routesForMapPromises = Object.entries(assignedRoutes)
    .map(async ([personId, orders], index) => {
        // For delivery role, only show their own route. For others, find the person.
        const deliveryPerson = isDeliveryPerson
            ? currentUser
            : deliveryPeople.find(p => p.id === personId);

        if (!deliveryPerson || orders.length === 0) return null;

        try {
            const optimizationResult = await optimizePharmacyRoute({
                startAddress: pharmacyLocation.address,
                orders: orders.map(o => ({ orderId: o.id, address: o.deliveryLocation.address })),
            });
            
            // Reorder the orders array based on the optimized route
            const reorderedOrders = optimizationResult.optimizedRoute.map(stop => {
                return orders.find(o => o.id === stop.orderId)!;
            }).filter(Boolean);

            return {
                deliveryPerson,
                orders: reorderedOrders,
                color: ROUTE_COLORS[index % ROUTE_COLORS.length],
                currentLocation: pharmacyLocation, // Placeholder
                optimizedPolyline: optimizationResult.encodedPolyline,
            };
        } catch (error) {
            console.error(`Could not optimize route for ${deliveryPerson.name}:`, error);
            // Fallback to showing the route without an optimized polyline
             return {
                deliveryPerson,
                orders,
                color: ROUTE_COLORS[index % ROUTE_COLORS.length],
                currentLocation: pharmacyLocation,
                optimizedPolyline: null,
            };
        }
    });

  const routesForMap = (await Promise.all(routesForMapPromises))
    .filter((r): r is RouteInfo => r !== null);


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">
            {isDeliveryPerson ? `Resumen de tus entregas, ${currentUser.name}.` : 'Un resumen de la operación de hoy.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isDeliveryPerson ? 'Mapa de Mi Ruta Actual' : 'Mapa de Entregas en Tiempo Real'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardMap 
            pharmacyLocation={pharmacyLocation} 
            routes={routesForMap} 
            pendingOrders={pendingOrders}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isDeliveryPerson ? 'Mis Pedidos del Día' : 'Pedidos del Día'}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailyOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isDeliveryPerson ? 'Mis Entregas Pendientes' : 'Entregas Pendientes'}</CardTitle>
            <Bike className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">Asignados o en tránsito</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isDeliveryPerson ? 'Mi Recaudo del Día' : 'Total Recaudado (Hoy)'}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailyRevenue.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</div>
            <p className="text-xs text-muted-foreground">Caja parcial de entregados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isDeliveryPerson ? 'Mis Rutas' : 'Gestión de Rutas'}</CardTitle>
            {isDeliveryPerson ? <ListOrdered className="h-4 w-4 text-muted-foreground" /> : <Map className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{isDeliveryPerson ? 'Ver Mis Entregas' : 'Optimiza Entregas'}</div>
            <p className="text-xs text-muted-foreground mb-4">{isDeliveryPerson ? 'Accede a los detalles de tu ruta.' : 'Planifica y asigna rutas.'}</p>
             <Button asChild size="sm">
              <Link href={isDeliveryPerson ? '/dashboard/mis-rutas' : '/dashboard/rutas'}>
                {isDeliveryPerson ? 'Ir a Mis Rutas' : 'Ir a Rutas'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isDeliveryPerson ? 'Mis Pedidos Recientes' : 'Pedidos Recientes'}</CardTitle>
            <CardDescription>
                {isDeliveryPerson ? 'Tus últimos 5 pedidos gestionados.' : 'Los últimos 5 pedidos gestionados en la plataforma.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.length > 0 ? (
                  stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                      <TableCell>{order.client?.fullName || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">{order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No hay pedidos recientes.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isDeliveryPerson ? 'Mis Ingresos de la Semana' : 'Ingresos de la Semana'}</CardTitle>
            <CardDescription>
                {isDeliveryPerson ? 'Tus ventas de los últimos 7 días.' : 'Resumen de ventas de los últimos 7 días.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyRevenueChart data={stats.weeklyRevenue} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
