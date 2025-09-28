import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { User as UserType } from '@/types';

// Define a schema for the GeoJSON Point
const PointSchema = new Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
    }
}, { _id: false });


// The User interface from types/index.ts might need to be extended for the document
export interface UserDocument extends Omit<UserType, 'id'>, Document {}

const UserSchema: Schema<UserDocument> = new Schema({
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'agent', 'delivery'] },
    cedula: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    avatarUrl: { type: String },
    status: { 
        type: String, 
        required: true,
        enum: ['available', 'in_route', 'offline'],
    },
    activeRoute: { type: String },
    password: { type: String, required: true },
    currentLocation: {
        type: PointSchema,
        required: false, // Explicitly not required on creation
        index: '2dsphere' // Crucial for geospatial queries
    },
    bearing: {
        type: Number,
        required: false,
    },
}, {
    timestamps: true // Adds createdAt and updatedAt
});

const UserModel: Model<UserDocument> = models.User || mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
