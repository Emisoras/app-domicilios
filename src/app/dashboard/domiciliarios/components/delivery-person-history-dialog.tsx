'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, User } from '@/types';
import { getDeliveredOrdersByDeliveryPerson } from '@/actions/order-actions';

interface DeliveryPersonHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    person: User | null;
}

export function DeliveryPersonHistoryDialog({ open, onOpenChange, person }: DeliveryPersonHistoryDialogProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && person) {
            const fetchHistory = async () => {
                setIsLoading(true);
                try {
                    const deliveredOrders = await getDeliveredOrdersByDeliveryPerson(person.id);
                    setOrders(deliveredOrders);
                } catch (error) {
                    console.error("Failed to fetch delivery person history", error);
                    // In a real app, you might want to show a toast message here.
                } finally {
                    setIsLoading(false);
                }
            };
            fetchHistory();
        }
    }, [open, person]);

    if (!person) return null;

    const totalCollected = orders.reduce((sum, order) => sum + order.total, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Historial de Entregas de {person.name}</DialogTitle>
                    <DialogDescription>
                        Un resumen de los pedidos entregados por este domiciliario desde la base de datos.
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
                        <>
                            <div className="mb-4 text-lg">
                                <strong>Total Recaudado:</strong> {totalCollected.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pedido</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Método Pago</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                                            <TableCell>{order.client.fullName}</TableCell>
                                            <TableCell>
                                                 <Badge variant={order.paymentMethod === 'cash' ? 'success' : 'accent'}>
                                                    {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground pt-4">No se encontraron pedidos entregados para este domiciliario.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
