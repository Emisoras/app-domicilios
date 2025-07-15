import type { Order } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, User, MapPin } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  stopNumber?: number;
  onAssign: (order: Order) => void;
  onViewDetails: (order: Order) => void;
}

export function OrderCard({ order, stopNumber, onAssign, onViewDetails }: OrderCardProps) {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const isPending = order.status === 'pending';
  const isAssigned = order.status === 'assigned' || order.status === 'in_transit';

  return (
    <Card className="relative pl-6">
      {stopNumber && (
         <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          {stopNumber}
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Pedido #{order.id.slice(-6)}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
          </span>
        </CardTitle>
        <CardDescription className="flex items-center gap-2 pt-2">
            <User className="h-4 w-4" /> {order.client.fullName}
        </CardDescription>
        <CardDescription className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {order.deliveryLocation.address}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2">
         <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" /> {totalItems} {totalItems > 1 ? 'productos' : 'producto'}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(order)}>Ver Detalles</Button>
        {isPending && (
          <Button size="sm" onClick={() => onAssign(order)}>Asignar Domiciliario</Button>
        )}
        {isAssigned && (
           <Button size="sm" variant="secondary" onClick={() => onAssign(order)}>Re-asignar</Button>
        )}
      </CardFooter>
    </Card>
  );
}
