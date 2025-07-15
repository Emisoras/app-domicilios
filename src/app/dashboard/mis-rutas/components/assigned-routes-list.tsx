'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, DollarSign, MapPin, BellRing } from "lucide-react";
import type { Order, OrderStatus } from '@/types';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStatus } from '@/actions/order-actions';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
    switch (status) {
        case 'in_transit':
            return <Badge variant="accent"><Clock className="mr-1 h-3 w-3" />En Tránsito</Badge>;
        case 'assigned':
             return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Asignado</Badge>;
        case 'delivered':
            return <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />Entregado</Badge>;
        case 'pending':
        default:
            return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
    }
};

interface AssignedRoutesListProps {
    initialOrders: Order[];
}

export function AssignedRoutesList({ initialOrders }: AssignedRoutesListProps) {
    const [orders, setOrders] = useState(initialOrders);
    const { toast } = useToast();

    const handleNotifyNearby = (order: Order) => {
        sendWhatsAppNotification(order.client.phone, 'nearby', order);
        toast({ title: 'Notificación Enviada', description: `Se abrió WhatsApp para avisar a ${order.client.fullName} que estás cerca.` });
    };

    const handleMarkDelivered = async (orderToUpdate: Order) => {
        const result = await updateOrderStatus(orderToUpdate.id, 'delivered');
        
        if (result.success) {
            setOrders(prev => prev.filter(o => o.id !== orderToUpdate.id));
            sendWhatsAppNotification(orderToUpdate.client.phone, 'delivered', orderToUpdate);
            toast({ title: 'Pedido Entregado', description: `El pedido de ${orderToUpdate.client.fullName} fue marcado como entregado.` });
        } else {
             toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    };

    return (
        <div className="grid gap-6">
            {orders.length > 0 ? (
                orders.map((order) => (
                    <Card key={order.id}>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>Pedido #{order.id.slice(-6)}</CardTitle>
                                <CardDescription>{order.client.fullName}</CardDescription>
                            </div>
                            <StatusBadge status={order.status} />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center text-sm">
                                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{order.deliveryLocation.address}</span>
                            </div>
                            <div className="flex items-center text-sm">
                                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} - <span className="font-semibold capitalize">{order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</span></span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t pt-4 mt-4">
                            <Button variant="outline" size="sm" onClick={() => handleNotifyNearby(order)}>
                                <BellRing className="mr-2 h-4 w-4" />
                                Notificar Cercanía
                            </Button>
                            <Button size="sm" onClick={() => handleMarkDelivered(order)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Marcar como Entregado
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            ) : (
                 <Card>
                    <CardContent className="p-8 text-center">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-4" />
                        <h2 className="text-xl font-semibold">¡Todas las entregas completadas!</h2>
                        <p className="text-muted-foreground">Buen trabajo. Ya puedes regresar a la base.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
