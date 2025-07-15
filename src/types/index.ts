export type Role = 'admin' | 'agent' | 'delivery';
export type DeliveryStatus = 'available' | 'in_route' | 'offline';

export interface User {
  id: string;
  name: string;
  role: Role;
  cedula: string;
  phone: string;
  avatarUrl?: string;
  status?: DeliveryStatus;
  activeRoute?: string | null;
  password?: string;
}

export interface Location {
  address: string;
  lat?: number;
  lng?: number;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  // Multiple addresses can be stored for a client
  addresses: Location[];
}

export type OrderStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  client: Client;
  deliveryLocation: Location; // The specific address for this order
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string; // ISO date string
  assignedTo?: User; // Delivery user
  createdBy: User; // Agent user
  total: number;
  paymentMethod: PaymentMethod;
  deliveryNotes?: string;
}
