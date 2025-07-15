'use server';

import connectDB from '@/lib/mongoose';
import ClientModel, { ClientDocument } from '@/models/client-model';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ClientFormSchema = z.object({
    fullName: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    phone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }),
});

function toPlainObject(doc: ClientDocument): any {
    const plain = doc.toObject({ getters: true, versionKey: false });
    plain.id = plain._id.toString();
    delete plain._id;
    return plain;
}

export async function getClients() {
  try {
    await connectDB();
    const clients = await ClientModel.find({}).sort({ createdAt: -1 });
    const plainClients = clients.map(toPlainObject);
    return plainClients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw new Error('Failed to fetch clients.');
  }
}

export async function createClient(formData: { fullName: string; phone: string; }) {
  const validatedFields = ClientFormSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, message: 'Datos inválidos. Por favor, revisa el formulario.' };
  }

  try {
    await connectDB();
    const newClient = new ClientModel({
        fullName: validatedFields.data.fullName,
        phone: validatedFields.data.phone,
        addresses: [],
    });
    await newClient.save();
    revalidatePath('/dashboard/clientes');
    return { success: true, message: `Cliente ${validatedFields.data.fullName} creado.` };
  } catch (error: any) {
    console.error('Error creating client:', error);
    if (error.code === 11000) { // Duplicate key error
        return { success: false, message: 'Ya existe un cliente con este número de teléfono.' };
    }
    return { success: false, message: 'No se pudo crear el cliente.' };
  }
}

export async function updateClient(id: string, formData: { fullName: string; phone: string; }) {
    const validatedFields = ClientFormSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos. Por favor, revisa el formulario.' };
    }

    try {
        await connectDB();
        await ClientModel.findByIdAndUpdate(id, { 
            fullName: validatedFields.data.fullName, 
            phone: validatedFields.data.phone 
        });
        revalidatePath('/dashboard/clientes');
        return { success: true, message: 'Cliente actualizado.' };
    } catch (error) {
        console.error('Error updating client:', error);
        return { success: false, message: 'No se pudo actualizar el cliente.' };
    }
}

export async function deleteClient(id: string) {
    try {
        await connectDB();
        await ClientModel.findByIdAndDelete(id);
        revalidatePath('/dashboard/clientes');
        return { success: true, message: 'Cliente eliminado.' };
    } catch (error) {
        console.error('Error deleting client:', error);
        return { success: false, message: 'No se pudo eliminar el cliente.' };
    }
}
