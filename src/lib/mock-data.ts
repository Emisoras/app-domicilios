import type { User, Client, Order, OrderStatus, Location, PaymentMethod } from '@/types';

// --- USERS ---
export const mockUserAgent: User = { id: 'agent01', name: 'Carlos Rivas', role: 'agent', cedula: '123456', phone: '3001112233'};
export const mockDeliveryPeople: User[] = [
    { id: 'DOM01', name: 'Miguel Torres', role: 'delivery', cedula: '789012', phone: '3012345678', avatarUrl: 'https://i.pravatar.cc/150?u=DOM01', status: 'available', activeRoute: null },
    { id: 'DOM02', name: 'Juan Cárdenas', role: 'delivery', cedula: '901234', phone: '3023456789', avatarUrl: 'https://i.pravatar.cc/150?u=DOM02', status: 'in_route', activeRoute: 'Ruta-01A' },
    { id: 'DOM03', name: 'Laura Jiménez', role: 'delivery', cedula: '567890', phone: '3034567890', avatarUrl: 'https://i.pravatar.cc/150?u=DOM03', status: 'available', activeRoute: null },
    { id: 'DOM04', name: 'Andrés Rojas', role: 'delivery', cedula: '123789', phone: '3045678901', avatarUrl: 'https://i.pravatar.cc/150?u=DOM04', status: 'offline', activeRoute: null },
];

// --- CLIENTS ---
export const mockClients: Client[] = [
    { id: 'client01', fullName: 'Ana García', phone: '3109876543', addresses: [{ address: 'Calle 11 # 15-01, Ocaña', lat: 8.238, lng: -73.352 }] },
    { id: 'client02', fullName: 'Luisa Martinez', phone: '3201234567', addresses: [{ address: 'Carrera 12 # 10-50, Ocaña', lat: 8.235, lng: -73.355 }] },
    { id: 'client03', fullName: 'Javier Rodríguez', phone: '3157654321', addresses: [{ address: 'Calle 9 # 12-30, Ocaña', lat: 8.233, lng: -73.356 }] },
    { id: 'client04', fullName: 'Carlos Pérez', phone: '3001234567', addresses: [{ address: 'Avenida 15 # 8-20, Ocaña', lat: 8.230, lng: -73.351 }] },
    { id: 'client05', fullName: 'Sofía Gómez', phone: '3188765432', addresses: [{ address: 'Calle 13 # 4-10, Ocaña', lat: 8.239, lng: -73.359 }] },
    { id: 'client06', fullName: 'Mario Luna', phone: '3115556677', addresses: [{ address: 'Transversal 12 # 5-15, Ocaña', lat: 8.232, lng: -73.358 }] },
];

// --- ORDERS (Single Source of Truth) ---
let ordersDB: Order[] = [
    { 
        id: 'ORD001', 
        client: mockClients[0],
        deliveryLocation: mockClients[0].addresses[0],
        items: [{ id: 'prod01', name: 'Acetaminofén', quantity: 1, price: 75500 }],
        status: 'in_transit',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        assignedTo: mockDeliveryPeople[1],
        createdBy: mockUserAgent,
        total: 75500,
        paymentMethod: 'cash'
    },
    { 
        id: 'ORD002', 
        client: mockClients[3],
        deliveryLocation: mockClients[3].addresses[0],
        items: [{ id: 'prod05', name: 'Ibuprofeno', quantity: 1, price: 32000 }],
        status: 'pending',
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        createdBy: mockUserAgent,
        total: 32000,
        paymentMethod: 'transfer'
    },
    { 
        id: 'ORD003', 
        client: mockClients[1],
        deliveryLocation: mockClients[1].addresses[0],
        items: [
            { id: 'prod02', name: 'Suero Fisiológico', quantity: 1, price: 88000 },
            { id: 'prod03', name: 'Analgésico', quantity: 1, price: 24000 },
        ],
        status: 'delivered',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        assignedTo: mockDeliveryPeople[0],
        createdBy: mockUserAgent,
        total: 112000,
        paymentMethod: 'transfer'
    },
    { 
        id: 'ORD004', 
        client: mockClients[2],
        deliveryLocation: mockClients[2].addresses[0],
        items: [{ id: 'prod04', name: 'Antibiótico', quantity: 1, price: 45000 }],
        status: 'in_transit',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        assignedTo: mockDeliveryPeople[1],
        createdBy: mockUserAgent,
        total: 45000,
        paymentMethod: 'cash'
    },
    { 
        id: 'ORD005', 
        client: mockClients[4],
        deliveryLocation: mockClients[4].addresses[0],
        items: [{ id: 'prod06', name: 'Pañales Etapa 3', quantity: 1, price: 92000 }],
        status: 'delivered',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: mockDeliveryPeople[0],
        createdBy: mockUserAgent,
        total: 92000,
        paymentMethod: 'cash'
    },
    { 
        id: 'ORD006', 
        client: mockClients[5],
        deliveryLocation: mockClients[5].addresses[0],
        items: [{ id: 'prod07', name: 'Alcohol Antiséptico', quantity: 1, price: 15000 }],
        status: 'cancelled',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        createdBy: mockUserAgent,
        total: 15000,
        paymentMethod: 'cash'
    },
     { 
        id: 'ORD007', 
        client: mockClients[5],
        deliveryLocation: mockClients[5].addresses[0],
        items: [{ id: 'prod08', name: 'Vitamina C', quantity: 2, price: 30000 }],
        status: 'in_transit',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        assignedTo: mockDeliveryPeople[2],
        createdBy: mockUserAgent,
        total: 60000,
        paymentMethod: 'cash'
    },
];

// --- DATA ACCESS FUNCTIONS ---

// Function to get all orders, sorted by most recent
export const getAllOrders = (): Order[] => {
    return [...ordersDB].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Function to get only pending orders for the routes page
export const getPendingOrders = (): Order[] => {
    return [...ordersDB].filter(o => o.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Function to get assigned orders grouped by delivery person
export const getAssignedOrdersGroupedByDeliveryPerson = (): Record<string, Order[]> => {
    const assignedOrders = ordersDB.filter(o => (o.status === 'in_transit' || o.status === 'assigned') && o.assignedTo);

    const grouped = assignedOrders.reduce<Record<string, Order[]>>((acc, order) => {
        const personId = order.assignedTo!.id;
        if (!acc[personId]) {
            acc[personId] = [];
        }
        acc[personId].push(order);
        // Sort orders for each person by creation date to have a consistent route order
        acc[personId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return acc;
    }, {});

    return grouped;
};

// Function to add a new order
export const addOrder = (order: Order) => {
    ordersDB.unshift(order); // Add to the beginning
}

// Function to update an order (e.g., change status, assign delivery)
export const updateOrder = (orderId: string, updates: Partial<Order>): Order | null => {
    const orderIndex = ordersDB.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
        ordersDB[orderIndex] = { ...ordersDB[orderIndex], ...updates };
        return ordersDB[orderIndex];
    }
    return null;
}
