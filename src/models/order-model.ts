import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';
import type { Order as OrderType, Location, OrderItem } from '@/types';

const LocationSchema: Schema<Location> = new Schema({
    address: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
}, { _id: false });

const OrderItemSchema: Schema<OrderItem> = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
}, { _id: false });

// This interface represents the Order document in MongoDB.
// It replaces reference types (like Client, User) with their MongoDB ObjectId equivalents.
export interface OrderDocument extends Omit<OrderType, 'id' | 'client' | 'assignedTo' | 'createdBy' | 'createdAt'>, Document {
    client: Types.ObjectId;
    assignedTo?: Types.ObjectId;
    createdBy: Types.ObjectId;
    createdAt: Date;
}

const OrderSchema: Schema<OrderDocument> = new Schema({
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    deliveryLocation: { type: LocationSchema, required: true },
    items: [OrderItemSchema],
    status: { type: String, required: true, enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'] },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true, enum: ['cash', 'transfer'] },
    deliveryNotes: { type: String },
}, {
    timestamps: true // This will add createdAt and updatedAt
});

const OrderModel: Model<OrderDocument> = models.Order || mongoose.model<OrderDocument>('Order', OrderSchema);

export default OrderModel;
