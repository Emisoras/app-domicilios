'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, Client, OrderStatus } from '@/types';
import { getOrdersByClientId } from '@/actions/order-actions';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<OrderStatus, { text: string, variant: BadgeProps['variant'] }> = {
    in_transit: { text: "En Camino", variant: 'accent' },
    pending: { text: "Pendiente", variant: 'outline' },
    delivered: { text: "Entregado", variant: 'success' },
    cancelled: { text: "Cancelado", variant: 'destructive' },
    assigned: { text: "Asignado", variant: 'secondary' },
};

function StatusBadge({ status }: { status: OrderStatus }) {
    const { text, variant } = statusConfig[status];
    return <Badge variant={variant}>{text}</Badge>;
}

interface ClientHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client | null;
}

export function ClientHistoryDialog({ open, onOpenChange, client }: ClientHistoryDialogProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && client) {
            const fetchOrders = async () => {
                setIsLoading(true);
                try {
                    const clientOrders = await getOrdersByClientId(client.id);
                    setOrders(clientOrders);
                } catch (error) {
                    console.error("Failed to fetch client history", error);
                    // In a real app, you might want to show a toast message here.
                } finally {
                    setIsLoading(false);
                }
            };
            fetchOrders();
        }
    }, [open, client]);


    if (!client) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Historial de Pedidos de {client.fullName}</DialogTitle>
                    <DialogDescription>
                        Un resumen de los pedidos realizados por este cliente desde la base de datos.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : orders.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pedido</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                                        <TableCell><StatusBadge status={order.status} /></TableCell>
                                        <TableCell>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: es })}</TableCell>
                                        <TableCell className="text-right">{order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground pt-4">No se encontraron pedidos para este cliente.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
