'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { OrderDetailsDialog } from './order-details-dialog';
import type { Order, OrderStatus, User } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { updateOrderStatus } from '@/actions/order-actions';

const statusConfig: Record<OrderStatus, { text: string, variant: BadgeProps['variant'] }> = {
    in_transit: { text: "En Camino", variant: 'accent' },
    pending: { text: "Pendiente", variant: 'outline' },
    delivered: { text: "Entregado", variant: 'success' },
    cancelled: { text: "Cancelado", variant: 'destructive' },
    assigned: { text: "Asignado", variant: 'secondary' },
};

function StatusBadge({ status }: { status: OrderStatus }) {
    const config = statusConfig[status] || { text: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.text}</Badge>;
}


interface OrdersListProps {
    initialOrders: Order[];
    deliveryPeople: User[];
}

export function OrdersList({ initialOrders, deliveryPeople }: OrdersListProps) {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const { toast } = useToast();

    const handleUpdateStatus = async (orderId: string, status: OrderStatus, assignedTo?: User) => {
        const result = await updateOrderStatus(orderId, status, assignedTo?.id);
        
        if (result.success) {
             toast({
                title: "Estado Actualizado",
                description: `El pedido #${orderId.slice(-6)} ahora está ${statusConfig[status].text.toLowerCase()}.`,
            });
        } else {
             toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: result.message,
            });
        }
    };
    
    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Domiciliario</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>
                            <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialOrders.map((pedido) => (
                        <TableRow key={pedido.id}>
                            <TableCell className="font-medium">#{pedido.id.slice(-6)}</TableCell>
                            <TableCell>{pedido.client?.fullName || 'Cliente no encontrado'}</TableCell>
                            <TableCell><StatusBadge status={pedido.status} /></TableCell>
                            <TableCell>
                                {formatDistanceToNow(new Date(pedido.createdAt), { addSuffix: true, locale: es })}
                            </TableCell>
                            <TableCell>{pedido.assignedTo?.name || 'N/A'}</TableCell>
                            <TableCell className="text-right">{pedido.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => setSelectedOrder(pedido)}>
                                            Ver Detalles
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger disabled={pedido.status === 'delivered' || pedido.status === 'cancelled'}>
                                            Cambiar Estado
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuPortal>
                                              <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => handleUpdateStatus(pedido.id, 'delivered')}>
                                                    Marcar como Entregado
                                                </DropdownMenuItem>

                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Asignar / En Tránsito</DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            {deliveryPeople.map(person => (
                                                                <DropdownMenuItem key={person.id} onSelect={() => handleUpdateStatus(pedido.id, 'in_transit', person)}>
                                                                    {person.name}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                </DropdownMenuSub>
                                                 
                                                 <DropdownMenuItem onSelect={() => handleUpdateStatus(pedido.id, 'pending')}>
                                                    Marcar como Pendiente
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-destructive"
                                                    onSelect={() => handleUpdateStatus(pedido.id, 'cancelled')}
                                                >
                                                    Cancelar Pedido
                                                </DropdownMenuItem>
                                              </DropdownMenuSubContent>
                                          </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <OrderDetailsDialog 
                order={selectedOrder} 
                open={!!selectedOrder} 
                onOpenChange={(open) => { if (!open) setSelectedOrder(null) }}
            />
        </>
    );
}
