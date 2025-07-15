import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Client as ClientType, Location } from '@/types';

const LocationSchema: Schema<Location> = new Schema({
    address: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
}, { _id: false });

export interface ClientDocument extends Omit<ClientType, 'id'>, Document {}

const ClientSchema: Schema<ClientDocument> = new Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    addresses: [LocationSchema],
}, {
    timestamps: true
});

const ClientModel: Model<ClientDocument> = models.Client || mongoose.model<ClientDocument>('Client', ClientSchema);

export default ClientModel;
