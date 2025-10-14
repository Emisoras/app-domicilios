
'use server';

import connectDB from '@/lib/mongoose';
import UserModel, { UserDocument } from '@/models/user-model';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Role, DeliveryStatus } from '@/types';
import bcrypt from 'bcryptjs';

// Schema for creating a user (password is required)
const UserCreateSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    phone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }),
    cedula: z.string().min(5, { message: "La cédula debe tener al menos 5 caracteres." }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
    role: z.enum(['admin', 'agent', 'delivery']),
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

    // Manually handle currentLocation conversion if it exists
    if (plain.currentLocation && plain.currentLocation.coordinates) {
        plain.currentLocation = {
            lng: plain.currentLocation.coordinates[0],
            lat: plain.currentLocation.coordinates[1]
        };
    }
    
    return plain;
}


export async function loginUser(credentials: { cedula: string, password?: string }) {
    const { cedula, password } = credentials;

    if (!cedula || !password) {
        return { success: false, message: 'Cédula y contraseña son requeridas.' };
    }

    try {
        await connectDB();
        
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
        return { success: false, message: 'Ocurrió un error durante el inicio de sesión. Revisa la conexión a la base de datos.' };
    }
}


export async function getUsers(role: Role) {
  try {
    await connectDB();
    const users = await UserModel.find({ role }).sort({ createdAt: -1 });
    return users.map(toPlainObject);
  } catch (error) {
    console.error(`Error fetching users with role ${role}:`, error);
    // Return empty array on DB connection error to prevent crash
    return [];
  }
}

export async function getAllUsers() {
  try {
    await connectDB();
    const users = await UserModel.find({}).sort({ role: 1, name: 1 });
    return users.map(toPlainObject);
  } catch (error) {
    console.error(`Error fetching all users:`, error);
     // Return empty array on DB connection error to prevent crash
    return [];
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


export async function createUser(formData: z.infer<typeof UserCreateSchema>) {
    const validatedFields = UserCreateSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos. Por favor, revisa el formulario.' };
    }
    
    const { name, phone, cedula, password, role } = validatedFields.data;
    
    try {
        await connectDB();

        const existingUser = await UserModel.findOne({ $or: [{ cedula }, { phone }] });
        if (existingUser) {
            if (existingUser.cedula === cedula) {
                return { success: false, message: 'Ya existe un usuario con esta cédula.' };
            }
            if (existingUser.phone === phone) {
                return { success: false, message: 'Ya existe un usuario con este número de teléfono.' };
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new UserModel({
            name,
            phone,
            cedula,
            password: hashedPassword,
            role: role,
            status: role === 'delivery' ? 'offline' : 'offline', // Start as offline
        });

        await newUser.save();
        
        revalidatePath('/dashboard/agentes');
        revalidatePath('/dashboard/domiciliarios');
        
        return { success: true, message: `Usuario ${name} creado exitosamente como ${role}.` };

    } catch (error: any) {
        console.error('Error saving new user:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            if (field === 'phone') {
                return { success: false, message: 'Ya existe un usuario con este número de teléfono.' };
            }
             if (field === 'cedula') {
                return { success: false, message: 'Ya existe un usuario con esta cédula.' };
            }
            return { success: false, message: `Ya existe un usuario con ese valor para el campo '${field}'.` };
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message).join(', ');
            return { success: false, message: `Error de validación: ${messages}` };
        }
        return { success: false, message: 'No se pudo crear el usuario. Ocurrió un error en la base de datos.' };
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

        const user = await UserModel.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true });
        
        if (!user) {
            return { success: false, message: 'Usuario no encontrado.' };
        }
        
        const plainUser = toPlainObject(user);

        // Revalidate all paths where users might appear
        revalidatePath('/dashboard/agentes');
        revalidatePath('/dashboard/domiciliarios');
        revalidatePath('/dashboard/configuracion');
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/cuadre-caja');

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

export async function updateUserLocation(userId: string, location: { lat: number, lng: number, bearing: number }) {
    try {
        await connectDB();
        
        // Find the user to check their current status
        const user = await UserModel.findById(userId);
        if (!user) return { success: false, message: 'User not found.' };

        // Only update location if the user is in_route. This prevents race conditions.
        if (user.status !== 'in_route') {
            return { success: false, message: 'User is not in route.' };
        }

        await UserModel.findByIdAndUpdate(userId, {
            $set: {
                currentLocation: {
                    type: 'Point',
                    coordinates: [location.lng, location.lat],
                },
                bearing: location.bearing,
                status: 'in_route', // Ensure status remains in_route
            }
        });
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/rutas');
        revalidatePath('/dashboard/domiciliarios');
        return { success: true };
    } catch (error) {
        console.error(`Error updating location for user ${userId}:`, error);
        return { success: false, message: 'Could not update location.' };
    }
}

export async function updateUserStatus(userId: string, status: DeliveryStatus) {
    try {
        await connectDB();
        const updatePayload: { status: DeliveryStatus, currentLocation?: any } = { status };

        // When going offline, explicitly unset the location to remove the icon from the map
        if (status === 'offline') {
            updatePayload.currentLocation = undefined;
        }

        const user = await UserModel.findByIdAndUpdate(userId, { $set: updatePayload }, { new: true });
        
        if (!user) {
            return { success: false, message: 'Usuario no encontrado.' };
        }

        revalidatePath('/dashboard/cuadre-caja');
        revalidatePath('/dashboard/domiciliarios');
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/rutas');
        
        return { success: true, user: toPlainObject(user) };
    } catch (error) {
        console.error(`Error updating status for user ${userId}:`, error);
        return { success: false, message: `No se pudo actualizar el estado a ${status}.` };
    }
}


    

    