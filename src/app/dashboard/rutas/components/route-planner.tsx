'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, PlusCircle, Loader2, User as UserIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Order, User, Client } from '@/types';
import { OrderCard } from './order-card';
import { CreateOrderDialog } from './create-order-dialog';
import { AssignDeliveryDialog } from './assign-delivery-dialog';
import { useToast } from "@/hooks/use-toast";
import { optimizePharmacyRoute } from '@/ai/flows/optimize-pharmacy-route';
import { Skeleton } from '@/components/ui/skeleton';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import type { RouteInfo } from '@/components/dashboard/map-component';
import { OrderDetailsDialog } from '../../pedidos/components/order-details-dialog';
import { updateOrderStatus } from '@/actions/order-actions';


const Map = dynamic(() => import('@/components/dashboard/map-component'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-lg" />
});


const ROUTE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-4))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];


interface RoutePlannerProps {
  initialPendingOrders: Order[];
  initialAssignedRoutes: Record<string, Order[]>;
  deliveryPeople: User[];
  clients: Client[];
  agent: User;
  pharmacyAddress: { address: string; lat: number; lng: number };
  pharmacyLocation: { lat: number, lng: number };
}

export function RoutePlanner({ initialPendingOrders, initialAssignedRoutes, deliveryPeople, clients, agent, pharmacyAddress, pharmacyLocation }: RoutePlannerProps) {
  const [pendingOrders, setPendingOrders] = useState<Order[]>(initialPendingOrders);
  const [assignedRoutes, setAssignedRoutes] = useState<Record<string, Order[]>>(initialAssignedRoutes);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingOrderDetails, setViewingOrderDetails] = useState<Order | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedPolyline, setOptimizedPolyline] = useState<string | null>(null);
  const { toast } = useToast();

  // Effect to sync state with server-side props when they change (due to revalidation)
  useEffect(() => {
    setPendingOrders(initialPendingOrders);
    setAssignedRoutes(initialAssignedRoutes);
  }, [initialPendingOrders, initialAssignedRoutes]);


  const handleOrderCreated = (newOrder: Order) => {
    // The state will be updated by revalidation, but we can optimistically show the notification
    setCreateDialogOpen(false);
    sendWhatsAppNotification(newOrder.client.phone, 'created', newOrder);
    toast({
      title: "Pedido Creado",
      description: `Se abrió WhatsApp para notificar a ${newOrder.client.fullName}. El pedido está listo para optimización y asignación.`,
    });
  };

  const handleOpenAssignDialog = (order: Order) => {
    setSelectedOrder(order);
    setAssignDialogOpen(true);
  };

  const handleViewDetails = (order: Order) => {
    setViewingOrderDetails(order);
  };
  
  const handleConfirmAssignment = async (orderId: string, deliveryPerson: User) => {
    const result = await updateOrderStatus(orderId, 'in_transit', deliveryPerson.id);

    if (result.success) {
        // Find the order that was updated to notify the client
        const allOrders = [...pendingOrders, ...Object.values(assignedRoutes).flat()];
        const order = allOrders.find(o => o.id === orderId);
        
        if (order) {
            sendWhatsAppNotification(order.client.phone, 'in_transit', { ...order, assignedTo: deliveryPerson });
            toast({
                title: 'Pedido en Camino',
                description: `Se asignó a ${deliveryPerson.name} y se abrió WhatsApp para notificar que el pedido #${orderId.slice(-6)} está en ruta.`,
            });
        }
        // After assigning an order that was part of an optimized route, clear the polyline
        setOptimizedPolyline(null);
    } else {
        toast({ variant: 'destructive', title: 'Error al asignar', description: result.message });
    }
  };

  const handleOptimizeRoute = async () => {
    if (pendingOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay pedidos pendientes",
        description: "Agrega al menos un pedido para optimizar la ruta.",
      });
      return;
    }
    setIsOptimizing(true);
    setOptimizedPolyline(null); // Clear previous polyline
    try {
      const input = {
        startAddress: pharmacyAddress.address,
        orders: pendingOrders.map(order => ({
          orderId: order.id,
          address: order.deliveryLocation.address,
        }))
      };
      
      const result = await optimizePharmacyRoute(input);
      
      const reorderedOrders = result.optimizedRoute.map(routeStop => {
        return pendingOrders.find(order => order.id === routeStop.orderId);
      }).filter((o): o is Order => !!o);

      setPendingOrders(reorderedOrders);
      setOptimizedPolyline(result.encodedPolyline);
      
      toast({
        title: "Ruta Optimizada",
        description: `Ruta calculada en ${result.estimatedTime}. La lista de pedidos pendientes ha sido reordenada.`,
      });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error de Optimización",
        description: `No se pudo optimizar la ruta. Error: ${error.message}`,
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const routesForMap: RouteInfo[] = useMemo(() => Object.entries(assignedRoutes).map(([personId, orders], index) => {
    const deliveryPerson = deliveryPeople.find(p => p.id === personId);
    if (!deliveryPerson) return null;
    return {
      deliveryPerson,
      orders,
      color: ROUTE_COLORS[index % ROUTE_COLORS.length]
    };
  }).filter((r): r is RouteInfo => r !== null), [assignedRoutes, deliveryPeople]);

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Gestión de Rutas</h1>
          <p className="text-muted-foreground">Asigna y optimiza las entregas del día.</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Pedido
          </Button>
          <Button onClick={handleOptimizeRoute} disabled={isOptimizing || pendingOrders.length === 0}>
            {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            {isOptimizing ? "Optimizando..." : "Optimizar Ruta con IA"}
          </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_2fr)] h-[calc(100vh-14rem)]">
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pedidos Pendientes ({pendingOrders.length})</CardTitle>
                    <CardDescription>Pedidos esperando para ser asignados a una ruta.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-48">
                        <div className="space-y-4 pr-4">
                        {pendingOrders.length > 0 ? (
                            pendingOrders.map((order, index) => (
                            <OrderCard 
                                key={order.id} 
                                order={order} 
                                stopNumber={index + 1} 
                                onAssign={handleOpenAssignDialog} 
                                onViewDetails={handleViewDetails}
                            />
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground p-8">No hay pedidos pendientes.</div>
                        )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Rutas Asignadas</CardTitle>
                    <CardDescription>Pedidos en curso agrupados por domiciliario.</CardDescription>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <CardContent>
                         <Accordion type="multiple" className="w-full">
                            {routesForMap.length > 0 ? routesForMap.map(({ deliveryPerson, orders, color }) => (
                                <AccordionItem value={deliveryPerson.id} key={deliveryPerson.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>{deliveryPerson.name} ({orders.length} pedidos)</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-2 space-y-3">
                                        {orders.map((order, index) => (
                                             <OrderCard 
                                                key={order.id} 
                                                order={order} 
                                                stopNumber={index + 1} 
                                                onAssign={handleOpenAssignDialog}
                                                onViewDetails={handleViewDetails}
                                            />
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            )) : (
                                <div className="text-center text-muted-foreground p-8">No hay rutas asignadas.</div>
                            )}
                        </Accordion>
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Mapa de Entregas</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 relative">
            {isOptimizing && (
               <div className="absolute inset-0 z-10 h-full w-full flex items-center justify-center bg-background/80 rounded-lg">
                  <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
                      <p className="text-muted-foreground mt-4">Optimizando ruta...</p>
                  </div>
              </div>
            )}
            <Map pharmacyLocation={pharmacyAddress} routes={routesForMap} pendingOrders={pendingOrders} optimizedPolyline={optimizedPolyline}/>
          </CardContent>
        </Card>
      </div>
      <CreateOrderDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onOrderCreated={handleOrderCreated}
        agent={agent}
        clients={clients}
        pharmacyLocation={pharmacyLocation}
      />
      <AssignDeliveryDialog 
        open={isAssignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        order={selectedOrder}
        deliveryPeople={deliveryPeople}
        onAssign={handleConfirmAssignment}
      />
      <OrderDetailsDialog 
        order={viewingOrderDetails}
        open={!!viewingOrderDetails}
        onOpenChange={(open) => !open && setViewingOrderDetails(null)}
      />
    </>
  );
}
