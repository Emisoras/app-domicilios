'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Smartphone, HandCoins, Users, PackageCheck, LogIn, LogOut, CalendarIcon, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCashReconciliationData } from "@/actions/order-actions";
import { getUserById } from "@/actions/user-actions";
import type { Order, User } from '@/types';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

// --- Reusable Components ---
const formatCurrency = (amount: number) => amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

const StatCard = ({ icon: Icon, title, value, isCurrency = false, className = '' }: { icon: React.ElementType, title: string, value: string, isCurrency?: boolean, className?: string }) => (
    <div className={`flex items-start gap-4 rounded-lg border p-4 ${className}`}>
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
            <p className="font-semibold">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const OrdersTable = ({ orders, showFooter }: { orders: Order[], showFooter?: boolean }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Total</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {orders.length > 0 ? (
                orders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                        <TableCell>{order.client.fullName}</TableCell>
                        <TableCell>
                            <Badge variant={order.paymentMethod === 'cash' ? 'success' : 'accent'}>
                                {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No hay pedidos entregados en esta fecha.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
        {showFooter && orders.length > 0 && (
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-bold text-lg">Total</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}
                    </TableCell>
                </TableRow>
            </TableFooter>
        )}
    </Table>
);


// --- Page ---
export default function CuadreCajaPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [date, setDate] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const sessionRes = await fetch('/api/session');
                if (!sessionRes.ok) throw new Error("No session");
                const session = await sessionRes.json();
                
                const user = await getUserById(session.userId);
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to load user session:", error);
                setIsLoading(false);
            }
        }
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        
        async function fetchDataForDate() {
            setIsLoading(true);
            const data = await getCashReconciliationData(date, currentUser);
            setOrders(data);
            setIsLoading(false);
        }

        fetchDataForDate();
    }, [date, currentUser]);

    if (!currentUser && !isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Inicia sesión para ver esta página.</div>;
    }

    if (!currentUser && isLoading) {
         return (
            <div className="flex flex-col gap-8">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    const isDeliveryPerson = currentUser?.role === 'delivery';

    // --- Admin/Agent View ---
    const GeneralCashReconciliation = () => {
        const totalCash = orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
        const totalTransfer = orders.filter(o => o.paymentMethod === 'transfer').reduce((sum, o) => sum + o.total, 0);
        const totalOrders = orders.length;
        const totalCollected = totalCash + totalTransfer;

        const ordersByDeliveryPerson = orders.reduce<Record<string, Order[]>>((acc, order) => {
            const deliveryPersonName = order.assignedTo?.name;
            if (!deliveryPersonName) return acc;

            if (!acc[deliveryPersonName]) acc[deliveryPersonName] = [];
            acc[deliveryPersonName].push(order);
            return acc;
        }, {});

        return (
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Cuadre de Caja General</h1>
                    <p className="text-muted-foreground">Consolidado de entregas y recaudos para la fecha seleccionada.</p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen del Día: {format(date, 'PPP', { locale: es })}</CardTitle>
                        <CardDescription>Totales combinados de todos los domiciliarios.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={PackageCheck} title="Pedidos Entregados" value={totalOrders.toString()} />
                        <StatCard icon={HandCoins} title="Total Efectivo" value={formatCurrency(totalCash)} isCurrency className="text-success" />
                        <StatCard icon={Smartphone} title="Total Transferencias" value={formatCurrency(totalTransfer)} isCurrency className="text-accent" />
                        <div className="flex items-start gap-4 rounded-lg border bg-primary text-primary-foreground p-4">
                            <Users className="h-8 w-8 text-primary-foreground/80" />
                            <div>
                                <p className="font-semibold">Total Recaudado</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalCollected)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div>
                    <h2 className="text-2xl font-bold font-headline mb-4">Desglose por Domiciliario</h2>
                    {Object.keys(ordersByDeliveryPerson).length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {Object.entries(ordersByDeliveryPerson).map(([name, personOrders]) => {
                                const subTotal = personOrders.reduce((sum, order) => sum + order.total, 0);
                                return (
                                    <AccordionItem value={name} key={name}>
                                        <AccordionTrigger className="text-lg font-medium hover:no-underline">
                                            <div className="flex items-center gap-4">
                                                <span>{name}</span>
                                                <Badge variant="outline">{personOrders.length} entregas</Badge>
                                            </div>
                                            <span className="text-xl font-bold text-primary">{formatCurrency(subTotal)}</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Card><CardContent className="pt-6"><OrdersTable orders={personOrders} showFooter={true} /></CardContent></Card>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">No hay pedidos entregados para mostrar en esta fecha.</CardContent></Card>
                    )}
                </div>
            </div>
        );
    };

    // --- Delivery Person View ---
    const PersonalCashReconciliation = () => {
        const totalCash = orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
        const totalTransfer = orders.filter(o => o.paymentMethod === 'transfer').reduce((sum, o) => sum + o.total, 0);
        const totalOrders = orders.length;
        const totalCollected = totalCash + totalTransfer;

        return (
            <div className="flex flex-col gap-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Mi Cuadre de Caja</h1>
                        <p className="text-muted-foreground">Resumen de tu turno, {currentUser?.name}.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline"><LogIn className="mr-2" /> Abrir Turno</Button>
                        <Button variant="destructive"><LogOut className="mr-2" /> Cerrar Turno</Button>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen del Día: {format(date, 'PPP', { locale: es })}</CardTitle>
                        <CardDescription>Tus totales de entregas y recaudos para la fecha seleccionada.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={PackageCheck} title="Mis Entregas" value={totalOrders.toString()} />
                        <StatCard icon={HandCoins} title="Mi Efectivo" value={formatCurrency(totalCash)} isCurrency className="text-success" />
                        <StatCard icon={Smartphone} title="Mis Transferencias" value={formatCurrency(totalTransfer)} isCurrency className="text-accent" />
                        <div className="flex items-start gap-4 rounded-lg border bg-primary text-primary-foreground p-4">
                            <Users className="h-8 w-8 text-primary-foreground/80" />
                            <div>
                                <p className="font-semibold">Mi Total Recaudado</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalCollected)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Desglose de Mis Entregas</CardTitle></CardHeader>
                    <CardContent><OrdersTable orders={orders} showFooter={true} /></CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-end">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => newDate && setDate(newDate)}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
            {isLoading ? (
                 <div className="flex flex-col gap-8">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : isDeliveryPerson ? <PersonalCashReconciliation /> : <GeneralCashReconciliation />}
        </div>
    )
}
