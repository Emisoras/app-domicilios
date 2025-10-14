
'use server';

import connectDB from '@/lib/mongoose';
import PharmacySettingsModel, { PharmacySettingsDocument } from '@/models/pharmacy-settings-model';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const PharmacySettingsSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
    phone: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }),
    lat: z.coerce.number(),
    lng: z.coerce.number(),
});

function toPlainObject(doc: PharmacySettingsDocument | null): any {
    if (!doc) return null;
    const plain = doc.toObject({ getters: true, versionKey: false });
    plain.id = plain._id.toString();
    delete plain._id;
    delete plain.singleton; // Don't expose this implementation detail
    return plain;
}

const SINGLETON_ID = 'main_pharmacy';
const defaultSettings = {
    name: 'Droguería Avenida',
    address: 'Avenida Cra 30 # 22-10, Bogotá',
    phone: '601-555-4321',
    lat: 8.250876,
    lng: -73.358425,
};


export async function getPharmacySettings() {
    try {
        await connectDB();
        
        const settings = await PharmacySettingsModel.findOneAndUpdate(
            { singleton: SINGLETON_ID },
            { 
                $setOnInsert: {
                    singleton: SINGLETON_ID,
                    ...defaultSettings
                }
            },
            { upsert: true, new: true }
        );

        return toPlainObject(settings);
    } catch (error) {
        console.error('Error fetching pharmacy settings:', error);
        // Return default values on error to prevent crashing the page
        return defaultSettings;
    }
}

export async function updatePharmacySettings(formData: z.infer<typeof PharmacySettingsSchema>) {
    const validatedFields = PharmacySettingsSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos. Por favor, revisa el formulario.' };
    }

    try {
        await connectDB();
        
        const { lat, lng, ...otherData } = validatedFields.data;

        const updatedSettings = await PharmacySettingsModel.findOneAndUpdate(
            { singleton: SINGLETON_ID },
            { 
                $set: {
                    ...otherData,
                    lat,
                    lng,
                } 
            },
            { new: true, upsert: true }
        );

        revalidatePath('/dashboard/configuracion');
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/rutas');
        revalidatePath('/dashboard/mis-rutas');

        return { success: true, message: 'Información de la farmacia actualizada.', settings: toPlainObject(updatedSettings) };
    } catch (error) {
        console.error('Error updating pharmacy settings:', error);
        return { success: false, message: 'No se pudo actualizar la información de la farmacia. Revisa la conexión a la base de datos.' };
    }
}

    