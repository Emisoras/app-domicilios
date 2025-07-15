'use server';

import connectDB from '@/lib/mongoose';
import UserModel, { UserDocument } from '@/models/user-model';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Role } from '@/types';
import bcrypt from 'bcryptjs';

// Schema for creating a user (password is required)
const UserCreateSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    phone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }),
    cedula: z.string().min(5, { message: "La cédula debe tener al menos 5 caracteres." }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

// Schema for updating a user (all fields are optional for partial updates)
const UserUpdateSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }).optional(),
    phone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }).optional(),
    cedula: z.string().min(5, { message: "La cédula debe tener al menos 5 caracteres." }).optional(),
    avatarUrl: z.string().url({ message: "Por favor, ingresa una URL de imagen válida." }).optional().or(z.literal('')),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).optional().or(z.literal('')),
    role: z.enum(['admin', 'agent', 'delivery']).optional(),
});


function toPlainObject(doc: UserDocument | null): any {
    if (!doc) return null;
    const plain = doc.toObject({ getters: true, versionKey: false });
    plain.id = plain._id.toString();
    delete plain._id;
    return plain;
}

export async function loginUser(credentials: { cedula: string, password?: string }) {
    const { cedula, password } = credentials;

    if (!cedula || !password) {
        return { success: false, message: 'Cédula y contraseña son requeridas.' };
    }

    try {
        await connectDB();

        // Self-seeding for the initial admin user
        const adminCedula = '1091656511';
        let adminUser = await UserModel.findOne({ cedula: adminCedula });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin1234', 10);
            adminUser = new UserModel({
                name: 'Camilo Toro',
                phone: '3156765529',
                cedula: adminCedula,
                password: hashedPassword,
                role: 'admin',
            });
            await adminUser.save();
        }

        const user = await UserModel.findOne({ cedula });
        
        if (!user) {
            return { success: false, message: 'Usuario no encontrado.' };
        }

        if (!user.password) {
            return { success: false, message: 'El usuario no tiene una contraseña configurada para iniciar sesión.' };
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return { success: false, message: 'Cédula o contraseña incorrecta.' };
        }

        return { success: true, user: toPlainObject(user) };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Ocurrió un error durante el inicio de sesión.' };
    }
}


export async function getUsers(role: Role) {
  try {
    await connectDB();
    const users = await UserModel.find({ role }).sort({ createdAt: -1 });
    return users.map(toPlainObject);
  } catch (error) {
    console.error(`Error fetching users with role ${role}:`, error);
    throw new Error('Failed to fetch users.');
  }
}

export async function getAllUsers() {
  try {
    await connectDB();
    const users = await UserModel.find({}).sort({ role: 1, name: 1 });
    return users.map(toPlainObject);
  } catch (error) {
    console.error(`Error fetching all users:`, error);
    throw new Error('Failed to fetch all users.');
  }
}

export async function getUserByCedula(cedula: string) {
    try {
        await connectDB();
        const user = await UserModel.findOne({ cedula });
        return toPlainObject(user);
    } catch (error) {
        console.error(`Error fetching user with cedula ${cedula}:`, error);
        throw new Error('Failed to fetch user.');
    }
}

export async function getUserById(id: string) {
    try {
        await connectDB();
        const user = await UserModel.findById(id);
        return toPlainObject(user);
    } catch (error) {
        console.error(`Error fetching user with id ${id}:`, error);
        throw new Error('Failed to fetch user.');
    }
}


export async function createUser(formData: z.infer<typeof UserCreateSchema>, role: Role) {
    const validatedFields = UserCreateSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos. Por favor, revisa el formulario.' };
    }
    
    const { name, phone, cedula, password } = validatedFields.data;

    try {
        await connectDB();

        const existingUser = await UserModel.findOne({ cedula });
        if (existingUser) {
            return { success: false, message: 'Ya existe un usuario con esta cédula.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new UserModel({
            name,
            phone,
            cedula,
            role,
            password: hashedPassword,
            status: role === 'delivery' ? 'offline' : undefined,
        });

        await newUser.save();
        
        if(role === 'agent') revalidatePath('/dashboard/agentes');
        if(role === 'delivery') revalidatePath('/dashboard/domiciliarios');
        
        return { success: true, message: `Usuario ${name} creado exitosamente.` };

    } catch (error: any) {
        console.error('Error creating user:', error);
        return { success: false, message: 'No se pudo crear el usuario.' };
    }
}

export async function updateUser(id: string, formData: z.infer<typeof UserUpdateSchema>) {
    const validatedFields = UserUpdateSchema.safeParse(formData);
    if (!validatedFields.success) {
        const errorMessages = validatedFields.error.issues.map(issue => issue.message).join(' ');
        return { success: false, message: `Datos inválidos: ${errorMessages}` };
    }

    const { password, ...updateData } = validatedFields.data;

    try {
        await connectDB();
        
        const updatePayload: any = { ...updateData };

        if (password) {
            updatePayload.password = await bcrypt.hash(password, 10);
        }

        const user = await UserModel.findByIdAndUpdate(id, updatePayload, { new: true });
        
        if (!user) {
            return { success: false, message: 'Usuario no encontrado.' };
        }
        
        const plainUser = toPlainObject(user);

        // Revalidate all paths where users might appear
        revalidatePath('/dashboard/agentes');
        revalidatePath('/dashboard/domiciliarios');
        revalidatePath('/dashboard/configuracion');

        return { success: true, message: 'Usuario actualizado exitosamente.', user: plainUser };

    } catch (error: any) {
        console.error('Error updating user:', error);
        if (error.code === 11000 && error.keyPattern?.cedula) {
            return { success: false, message: 'La cédula ya está en uso por otro usuario.' };
        }
        return { success: false, message: 'No se pudo actualizar el usuario.' };
    }
}


export async function deleteUser(id: string) {
    try {
        await connectDB();
        const user = await UserModel.findByIdAndDelete(id);
        if (!user) {
            return { success: false, message: 'Usuario no encontrado.' };
        }
        
        if(user.role === 'agent') revalidatePath('/dashboard/agentes');
        if(user.role === 'delivery') revalidatePath('/dashboard/domiciliarios');

        return { success: true, message: 'Usuario eliminado.' };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, message: 'No se pudo eliminar el usuario.' };
    }
}
