'use server';

import connectDB from '@/lib/mongoose';
import OrderModel, { type OrderDocument } from '@/models/order-model';
import ClientModel from '@/models/client-model';
import type { Client } from '@/models/client-model';
import type { User } from '@/models/user-model';
import { revalidatePath } from 'next/cache';
import type { OrderStatus, Role } from '@/types';
import { z } from 'zod';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import mongoose from 'mongoose';

// Helper to convert Mongoose doc to plain object, including nested ones
function toPlainObject(doc: any): any {
    if (!doc) return null;
    const plain = doc.toObject({ getters: true, versionKey: false });
    plain.id = plain._id.toString();
    delete plain._id;

    if (plain.client && typeof plain.client === 'object' && plain.client._id) {
        plain.client.id = plain.client._id.toString();
        delete plain.client._id;
    }
    if (plain.createdBy && typeof plain.createdBy === 'object' && plain.createdBy._id) {
        plain.createdBy.id = plain.createdBy._id.toString();
        delete plain.createdBy._id;
    }
    if (plain.assignedTo && typeof plain.assignedTo === 'object' && plain.assignedTo._id) {
        plain.assignedTo.id = plain.assignedTo._id.toString();
        delete plain.assignedTo._id;
    }
    
    // Ensure createdAt is a string
    if (plain.createdAt instanceof Date) {
        plain.createdAt = plain.createdAt.toISOString();
    }
    if (plain.updatedAt instanceof Date) {
        plain.updatedAt = plain.updatedAt.toISOString();
    }

    return plain;
}

export async function getOrders() {
    try {
        await connectDB();
        const orders = await OrderModel.find({})
            .populate<{client: Client}>('client')
            .populate<{createdBy: User}>('createdBy')
            .populate<{assignedTo: User}>('assignedTo')
            .sort({ createdAt: -1 });
        
        return orders.map(toPlainObject);
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw new Error('Failed to fetch orders.');
    }
}

export async function getOrdersByDeliveryPerson(userId: string) {
    try {
        await connectDB();
        const orders = await OrderModel.find({ 
            assignedTo: userId,
            status: { $in: ['in_transit', 'assigned'] }
        })
            .populate<{client: Client}>('client')
            .populate<{createdBy: User}>('createdBy')
            .populate<{assignedTo: User}>('assignedTo')
            .sort({ createdAt: 1 }); // Sort by oldest first for route order
        
        return orders.map(toPlainObject);
    } catch (error) {
        console.error(`Error fetching orders for user ${userId}:`, error);
        throw new Error('Failed to fetch assigned orders.');
    }
}

export async function getOrdersByClientId(clientId: string) {
    try {
        await connectDB();
        const orders = await OrderModel.find({ client: clientId })
            .populate<{client: Client}>('client')
            .populate<{createdBy: User}>('createdBy')
            .populate<{assignedTo: User}>('assignedTo')
            .sort({ createdAt: -1 });
        
        return orders.map(toPlainObject);
    } catch (error) {
        console.error(`Error fetching orders for client ${clientId}:`, error);
        throw new Error('Failed to fetch client orders.');
    }
}

export async function getDeliveredOrdersByDeliveryPerson(userId: string) {
    try {
        await connectDB();
        const orders = await OrderModel.find({ 
            assignedTo: userId,
            status: 'delivered' 
        })
            .populate<{client: Client}>('client')
            .populate<{createdBy: User}>('createdBy')
            .populate<{assignedTo: User}>('assignedTo')
            .sort({ createdAt: -1 });
        
        return orders.map(toPlainObject);
    } catch (error) {
        console.error(`Error fetching delivered orders for user ${userId}:`, error);
        throw new Error('Failed to fetch delivered orders.');
    }
}


const OrderFormSchema = z.object({
  clientName: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  clientPhone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }),
  deliveryLocation: z.object({
    address: z.string().min(5, { message: "La dirección es obligatoria." }),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive()
  })).min(1, { message: "El pedido debe tener al menos un producto." }),
  total: z.coerce.number().positive({ message: "El total debe ser un número positivo." }),
  paymentMethod: z.enum(['cash', 'transfer']),
  createdBy: z.string(), // This should be a valid ObjectId string for the User
});


export async function createOrder(formData: z.infer<typeof OrderFormSchema>) {
    const validatedFields = OrderFormSchema.safeParse(formData);
    if (!validatedFields.success) {
        const errorMessages = validatedFields.error.issues.map(issue => issue.message).join(' ');
        return { success: false, message: `Datos de pedido inválidos: ${errorMessages}` };
    }

    const { clientName, clientPhone, deliveryLocation, items, total, paymentMethod, createdBy } = validatedFields.data;

    try {
        await connectDB();
        
        let client = await ClientModel.findOne({ phone: clientPhone });

        if (!client) {
            client = new ClientModel({
                fullName: clientName,
                phone: clientPhone,
                addresses: [deliveryLocation]
            });
            await client.save();
        } else {
            const addressExists = client.addresses.some(addr => addr.address === deliveryLocation.address);
            if (!addressExists) {
                client.addresses.push(deliveryLocation);
                await client.save();
            }
        }

        const newOrder = new OrderModel({
            client: client._id,
            deliveryLocation,
            items,
            total,
            paymentMethod,
            createdBy,
            status: 'pending',
        });

        await newOrder.save();

        revalidatePath('/dashboard/pedidos');
        revalidatePath('/dashboard/rutas');

        const populatedOrder = await OrderModel.findById(newOrder._id)
            .populate<{client: Client}>('client')
            .populate<{createdBy: User}>('createdBy')
            .populate<{assignedTo: User}>('assignedTo');
            
        const plainOrder = toPlainObject(populatedOrder);

        return { success: true, message: 'Pedido creado exitosamente.', order: plainOrder };

    } catch (error: any) {
        console.error('Error creating order:', error);
        return { success: false, message: 'No se pudo crear el pedido.' };
    }
}


export async function updateOrderStatus(orderId: string, status: OrderStatus, assignedToId?: string) {
    try {
        await connectDB();
        
        const updatePayload: { status: OrderStatus; assignedTo?: string | null | mongoose.Types.ObjectId } = { status };
        
        if (assignedToId) {
            updatePayload.assignedTo = new mongoose.Types.ObjectId(assignedToId);
        } else if (status === 'pending') {
            // If we're setting it back to pending, unassign the delivery person
            updatePayload.assignedTo = null;
        }

        const updatedOrder = await OrderModel.findByIdAndUpdate(orderId, { $set: updatePayload }, { new: true });

        if (!updatedOrder) {
            return { success: false, message: 'Pedido no encontrado.' };
        }

        revalidatePath('/dashboard/pedidos');
        revalidatePath('/dashboard/rutas');
        revalidatePath('/dashboard/mis-rutas');
        revalidatePath('/dashboard/cuadre-caja');
        revalidatePath('/dashboard');
        
        return { success: true, message: `Estado del pedido actualizado a ${status}.` };

    } catch (error) {
        console.error('Error updating order status:', error);
        return { success: false, message: 'No se pudo actualizar el estado del pedido.' };
    }
}

export async function getDashboardStats(user?: User) {
    try {
        await connectDB();

        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

        // Base query filters
        const dailyMatch = { createdAt: { $gte: todayStart, $lte: todayEnd } };
        const deliveredDailyMatch = { status: 'delivered', createdAt: { $gte: todayStart, $lte: todayEnd } };
        const weeklyDeliveredMatch = { status: 'delivered', createdAt: { $gte: sevenDaysAgo } };
        const pendingMatch = { status: { $in: ['in_transit', 'assigned'] } };
        
        // If a delivery person is provided, scope all queries to them
        const userFilter = user?.role === 'delivery' ? { assignedTo: new mongoose.Types.ObjectId(user.id) } : {};

        const dailyOrdersCount = await OrderModel.countDocuments({ ...dailyMatch, ...userFilter });
        const pendingDeliveriesCount = await OrderModel.countDocuments({ ...pendingMatch, ...userFilter });

        const dailyRevenueResult = await OrderModel.aggregate([
            { $match: { ...deliveredDailyMatch, ...userFilter } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const dailyRevenue = dailyRevenueResult.length > 0 ? dailyRevenueResult[0].total : 0;
        
        const recentOrdersForUser = await OrderModel.find(userFilter)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate<{client: Client}>('client');
        const recentOrders = recentOrdersForUser.map(toPlainObject);

        const weeklyRevenueResult = await OrderModel.aggregate([
            { $match: { ...weeklyDeliveredMatch, ...userFilter } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                    },
                    revenue: { $sum: '$total' }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        const weeklyRevenueData = [];
        const dateMap = new Map(weeklyRevenueResult.map(item => {
            const dateStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
            return [dateStr, item.revenue];
        }));

        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayName = format(date, 'E', { locale: es });
            const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');

            weeklyRevenueData.push({
                day: formattedDayName,
                revenue: dateMap.get(dateStr) || 0
            });
        }
        
        return {
            dailyOrders: dailyOrdersCount,
            pendingDeliveries: pendingDeliveriesCount,
            dailyRevenue,
            recentOrders,
            weeklyRevenue: weeklyRevenueData
        };

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            dailyOrders: 0,
            pendingDeliveries: 0,
            dailyRevenue: 0,
            recentOrders: [],
            weeklyRevenue: Array(7).fill(0).map((_, i) => ({
                day: format(subDays(new Date(), 6 - i), 'E', { locale: es }).charAt(0).toUpperCase(),
                revenue: 0
            }))
        };
    }
}

export async function getCashReconciliationData(date: Date, user?: User) {
    try {
        await connectDB();
        const dateStart = startOfDay(date);
        const dateEnd = endOfDay(date);

        const baseFilter = {
            status: 'delivered',
            createdAt: { $gte: dateStart, $lte: dateEnd }
        };

        const userFilter = user?.role === 'delivery'
            ? { assignedTo: new mongoose.Types.ObjectId(user.id) }
            : {};
        
        const filter = { ...baseFilter, ...userFilter };
        
        const orders = await OrderModel.find(filter)
            .populate<{client: Client}>('client')
            .populate<{assignedTo: User}>('assignedTo')
            .sort({ createdAt: -1 });

        return orders.map(toPlainObject);
    } catch (error) {
        console.error('Error fetching cash reconciliation data:', error);
        return [];
    }
}
