import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface PharmacySettings {
    name: string;
    address: string;
    phone: string;
}

export interface PharmacySettingsDocument extends PharmacySettings, Document {
    singleton: string;
}

const PharmacySettingsSchema: Schema<PharmacySettingsDocument> = new Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    singleton: {
        type: String,
        default: 'main_pharmacy',
        unique: true,
        required: true,
    }
}, {
    timestamps: true
});

const PharmacySettingsModel: Model<PharmacySettingsDocument> = models.PharmacySettings || mongoose.model<PharmacySettingsDocument>('PharmacySettings', PharmacySettingsSchema);

export default PharmacySettingsModel;
