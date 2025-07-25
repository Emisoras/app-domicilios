import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { User as UserType } from '@/types';

// The User interface from types/index.ts might need to be extended for the document
export interface UserDocument extends Omit<UserType, 'id'>, Document {}

const UserSchema: Schema<UserDocument> = new Schema({
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'agent', 'delivery'] },
    cedula: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    avatarUrl: { type: String },
    status: { type: String, enum: ['available', 'in_route', 'offline'] },
    activeRoute: { type: String },
    password: { type: String, required: false },
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: undefined
        }
    },
    bearing: { type: Number, default: 0 }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Create a 2dsphere index for geospatial queries
UserSchema.index({ currentLocation: '2dsphere' });


const UserModel: Model<UserDocument> = models.User || mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
