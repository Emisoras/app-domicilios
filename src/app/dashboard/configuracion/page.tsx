
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, Role } from "@/types";
import { MoreHorizontal, Shield, Loader2 } from "lucide-react";
import { ChangeRoleDialog } from "./components/change-role-dialog";
import { EditAgentDialog } from '../agentes/components/edit-agent-dialog';
import { EditDeliveryPersonDialog } from '../domiciliarios/components/edit-delivery-person-dialog';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, updateUser, getUserById } from '@/actions/user-actions';
import { getPharmacySettings, updatePharmacySettings } from '@/actions/pharmacy-settings-actions';
import type { PharmacySettings } from '@/models/pharmacy-settings-model';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const roleConfig: Record<Role, { text: string, variant: BadgeProps['variant'] }> = {
    admin: { text: "Admin", variant: 'destructive' },
    agent: { text: "Agente", variant: 'secondary' },
    delivery: { text: "Domiciliario", variant: 'outline' },
};

const profileFormSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    cedula: z.string().min(5, { message: "La cédula debe tener al menos 5 caracteres." }),
    phone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }),
    avatarUrl: z.string().url({ message: "Por favor, ingresa una URL de imagen válida." }).optional().or(z.literal('')),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).optional().or(z.literal('')),
});

const pharmacyFormSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    address: z.string().min(5, { message: "La dirección es obligatoria." }),
    phone: z.string().min(7, { message: "El teléfono debe tener al menos 7 dígitos." }),
});


export default function ConfiguracionPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { toast } = useToast();
    
    const profileForm = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: { name: '', cedula: '', phone: '', avatarUrl: '', password: '' }
    });
    
    const pharmacyForm = useForm<z.infer<typeof pharmacyFormSchema>>({
        resolver: zodResolver(pharmacyFormSchema),
        defaultValues: { name: '', address: '', phone: '' }
    });

    const avatarUrl = profileForm.watch('avatarUrl');

    useEffect(() => {
        async function loadInitialData() {
            try {
                setIsLoading(true);
                const sessionRes = await fetch('/api/session');
                if (!sessionRes.ok) throw new Error("No session");
                const session = await sessionRes.json();
                
                const [allUsers, loggedInUser, settings] = await Promise.all([
                    getAllUsers(),
                    getUserById(session.userId),
                    getPharmacySettings()
                ]);

                setUsers(allUsers);
                setCurrentUser(loggedInUser);
                setPharmacySettings(settings);

            } catch (error) {
                console.error("Failed to load configuration data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la configuración.' });
            } finally {
                setIsLoading(false);
            }
        }
        
        loadInitialData();
    }, [toast]);


    useEffect(() => {
        if (currentUser) {
            profileForm.reset({
                name: currentUser.name,
                cedula: currentUser.cedula,
                phone: currentUser.phone,
                avatarUrl: currentUser.avatarUrl || '',
                password: '',
            });
        }
    }, [currentUser, profileForm]);
    
    useEffect(() => {
        if (pharmacySettings) {
            pharmacyForm.reset({
                name: pharmacySettings.name,
                address: pharmacySettings.address,
                phone: pharmacySettings.phone,
            });
        }
    }, [pharmacySettings, pharmacyForm]);

    const handleRoleChanged = async (userId: string, newRole: Role) => {
        const result = await updateUser(userId, { role: newRole });
        if (result.success && result.user) {
            setUsers(currentUsers =>
                currentUsers.map(user =>
                    user.id === userId ? result.user! : user
                )
            );
            toast({
                title: "Rol Actualizado",
                description: `El rol de ${result.user.name} ha sido cambiado.`,
            });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
    };

    const handleUserUpdated = (updatedUser: User) => {
        setUsers(currentUsers =>
            currentUsers.map(user =>
                user.id === updatedUser.id ? updatedUser : user
            )
        );
        if (currentUser && currentUser.id === updatedUser.id) {
            setCurrentUser(updatedUser);
        }
        setEditingUser(null);
    };

    const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
        if (!currentUser) return;
        const result = await updateUser(currentUser.id, values);

        if (result.success && result.user) {
            setCurrentUser(result.user);
            toast({
                title: "Perfil Actualizado",
                description: "Tu información personal ha sido guardada correctamente."
            });
            profileForm.reset({ ...values, password: '' });
        } else {
            toast({ variant: 'destructive', title: 'Error al actualizar', description: result.message });
        }
    };

    const onPharmacySubmit = async (values: z.infer<typeof pharmacyFormSchema>) => {
        const result = await updatePharmacySettings(values);
        if (result.success && result.settings) {
            setPharmacySettings(result.settings);
            toast({
                title: "Información Actualizada",
                description: "Los datos de la farmacia han sido guardados."
            });
        } else {
            toast({ variant: 'destructive', title: 'Error al guardar', description: result.message });
        }
    };

    const openChangeRoleDialog = (user: User) => {
        setSelectedUserForRoleChange(user);
    };

    if (isLoading) {
        return (
             <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Configuración</h1>
                    <p className="text-muted-foreground">Ajusta las preferencias de tu cuenta y del sistema.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <Skeleton className="h-40 md:col-span-1" />
                    <div className="md:col-span-3 space-y-4">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    const userInitials = currentUser?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <>
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Configuración</h1>
                    <p className="text-muted-foreground">Ajusta las preferencias de tu cuenta y del sistema.</p>
                </div>

                <Tabs defaultValue="perfil" className="flex flex-col md:flex-row gap-8">
                    <TabsList className="flex md:flex-col h-auto items-start bg-transparent p-0 border-b md:border-b-0 md:border-r">
                        <TabsTrigger value="perfil" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 py-2">Mi Perfil</TabsTrigger>
                        <TabsTrigger value="farmacia" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 py-2">Farmacia</TabsTrigger>
                        <TabsTrigger value="notificaciones" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 py-2">Notificaciones</TabsTrigger>
                        {currentUser?.role === 'admin' && (
                            <TabsTrigger value="usuarios" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 py-2">
                                <Shield className="mr-2 h-4 w-4" />
                                Gestión de Usuarios
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="sistema" className="w-full justify-start data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 py-2">Sistema</TabsTrigger>
                    </TabsList>

                    <div className="flex-1">
                        <TabsContent value="perfil">
                            <Card>
                                <Form {...profileForm}>
                                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                        <CardHeader>
                                            <CardTitle>Información del Perfil</CardTitle>
                                            <CardDescription>Gestiona tu información personal y de contacto.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-6">
                                                <Avatar className="h-24 w-24">
                                                    <AvatarImage src={avatarUrl} alt={currentUser?.name} />
                                                    <AvatarFallback>{userInitials}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <FormField
                                                        control={profileForm.control}
                                                        name="avatarUrl"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>URL de la Foto de Perfil</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="https://ejemplo.com/imagen.png" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                             <FormField
                                                control={profileForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nombre Completo</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="cedula"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cédula</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Teléfono</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nueva Contraseña</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" placeholder="Dejar en blanco para no cambiar" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                        <CardFooter className="border-t px-6 py-4">
                                            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                                                {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Guardar Cambios
                                            </Button>
                                        </CardFooter>
                                    </form>
                                </Form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="farmacia">
                            <Card>
                                <Form {...pharmacyForm}>
                                    <form onSubmit={pharmacyForm.handleSubmit(onPharmacySubmit)}>
                                        <CardHeader>
                                            <CardTitle>Información de la Farmacia</CardTitle>
                                            <CardDescription>Datos de la sucursal principal desde donde salen los domicilios.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <FormField
                                                control={pharmacyForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nombre de la Farmacia</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={pharmacyForm.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Dirección de Partida</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={pharmacyForm.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Teléfono de la Farmacia</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                        <CardFooter className="border-t px-6 py-4">
                                            <Button type="submit" disabled={pharmacyForm.formState.isSubmitting}>
                                                {pharmacyForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Guardar Cambios
                                            </Button>
                                        </CardFooter>
                                    </form>
                                </Form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notificaciones">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Preferencias de Notificaciones</CardTitle>
                                    <CardDescription>Elige cómo quieres recibir las alertas del sistema.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                       <div>
                                         <Label htmlFor="email-notifications" className="font-semibold">Notificaciones por Email</Label>
                                         <p className="text-sm text-muted-foreground">Recibir un resumen diario por correo.</p>
                                       </div>
                                        <Switch id="email-notifications" />
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div>
                                         <Label htmlFor="push-notifications" className="font-semibold">Notificaciones Push</Label>
                                          <p className="text-sm text-muted-foreground">Alertas en tiempo real en tu navegador.</p>
                                       </div>
                                        <Switch id="push-notifications" defaultChecked />
                                    </div>
                                </CardContent>
                                 <CardFooter className="border-t px-6 py-4">
                                    <Button>Guardar Cambios</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {currentUser?.role === 'admin' && (
                            <TabsContent value="usuarios">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Gestión de Usuarios y Roles</CardTitle>
                                        <CardDescription>
                                            Añade, edita y gestiona los roles y permisos de los usuarios del sistema.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nombre</TableHead>
                                                    <TableHead>Rol Asignado</TableHead>
                                                    <TableHead>
                                                        <span className="sr-only">Acciones</span>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {users.map((user) => (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium">{user.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={roleConfig[user.role].variant}>
                                                                {roleConfig[user.role].text}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.id === currentUser?.id}>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                        <span className="sr-only">Toggle menu</span>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuItem onSelect={() => setEditingUser(user)}>
                                                                        Editar Usuario
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => openChangeRoleDialog(user)}>Cambiar Rol</DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-destructive" disabled>Suspender</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}

                         <TabsContent value="sistema">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Sistema</CardTitle>
                                    <CardDescription>Ajustes generales del sistema y la aplicación.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Versión de la Aplicación</p>
                                            <p className="text-sm text-muted-foreground">Estás en la versión 1.0.0</p>
                                        </div>
                                        <Button variant="outline">Buscar Actualizaciones</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <ChangeRoleDialog
                open={!!selectedUserForRoleChange}
                onOpenChange={(open) => !open && setSelectedUserForRoleChange(null)}
                user={selectedUserForRoleChange}
                onRoleChanged={handleRoleChanged}
            />

            <EditAgentDialog
                open={!!(editingUser && editingUser.role === 'agent')}
                onOpenChange={(open) => !open && setEditingUser(null)}
                agent={editingUser?.role === 'agent' ? editingUser : null}
                onUserUpdated={handleUserUpdated}
            />
            
            <EditDeliveryPersonDialog
                open={!!(editingUser && editingUser.role === 'delivery')}
                onOpenChange={(open) => !open && setEditingUser(null)}
                person={editingUser?.role === 'delivery' ? editingUser : null}
                onUserUpdated={handleUserUpdated}
            />
        </>
    );

    