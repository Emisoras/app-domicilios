'use client';

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, MapPin, DollarSign, Calendar, Bike } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<OrderStatus, { text: string, variant: BadgeProps['variant'] }> = {
    in_transit: { text: "En Camino", variant: 'accent' },
    pending: { text: "Pendiente", variant: 'outline' },
    delivered: { text: "Entregado", variant: 'success' },
    cancelled: { text: "Cancelado", variant: 'destructive' },
    assigned: { text: "Asignado", variant: 'secondary' },
};

interface OrderDetailsDialogProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
    if (!order) return null;

    const { text, variant } = statusConfig[order.status];
    const paymentMethodText = order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Detalles del Pedido #{order.id}</span>
                         <Badge variant={variant} className="text-sm">{text}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Información completa del pedido y el cliente.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                         <h4 className="font-semibold">Información del Cliente</h4>
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{order.client.fullName}</span>
                        </div>
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{order.deliveryLocation.address}</span>
                        </div>
                    </div>
                    <Separator />
                     <div className="space-y-2">
                         <h4 className="font-semibold">Resumen del Pedido</h4>
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Realizado {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: es })}</span>
                        </div>
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>{paymentMethodText}</span>
                        </div>
                        {order.assignedTo && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Bike className="h-4 w-4" />
                                <span>Asignado a: {order.assignedTo.name}</span>
                            </div>
                        )}
                    </div>
                     <div className="space-y-2">
                         <h4 className="font-semibold">Productos</h4>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cant.</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell className="text-right">{item.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </div>
                    <Separator />
                    <div className="flex justify-end items-center font-bold text-lg">
                        <span>Total:</span>
                        <span className="ml-4">{order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
