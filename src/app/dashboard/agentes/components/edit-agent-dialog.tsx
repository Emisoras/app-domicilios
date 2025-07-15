'use client';

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from 'lucide-react';
import type { User } from '@/types';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/actions/user-actions';

const formSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    phone: z.string().regex(/^\d{10}$/, { message: "El teléfono debe tener 10 dígitos." }),
    cedula: z.string().min(5, { message: "La cédula debe tener al menos 5 caracteres." }),
    avatarUrl: z.string().url({ message: "Por favor, ingresa una URL de imagen válida." }).optional().or(z.literal('')),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).optional().or(z.literal('')),
});

interface EditAgentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent: User | null;
    onUserUpdated?: (user: User) => void;
}

export function EditAgentDialog({ open, onOpenChange, agent, onUserUpdated }: EditAgentDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const avatarUrl = form.watch('avatarUrl');

    useEffect(() => {
        if (agent) {
            form.reset({
                name: agent.name,
                phone: agent.phone,
                cedula: agent.cedula,
                avatarUrl: agent.avatarUrl || '',
                password: '',
            });
        }
    }, [agent, form]);

    if (!agent) return null;

    const userInitials = agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        const result = await updateUser(agent.id, values);

        if (result.success && result.user) {
            toast({
                title: "Agente Actualizado",
                description: `La información de ${values.name} ha sido guardada.`,
            });
            if (onUserUpdated) {
                onUserUpdated(result.user);
            }
            onOpenChange(false);
        } else {
             toast({
                variant: 'destructive',
                title: "Error al actualizar",
                description: result.message,
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editar Agente</DialogTitle>
                    <DialogDescription>
                        Actualiza la información del miembro del equipo.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex items-center gap-4">
                             <Avatar className="h-20 w-20">
                                <AvatarImage src={avatarUrl} alt={agent.name} />
                                <AvatarFallback>{userInitials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <FormField
                                    control={form.control}
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
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Carolina Mesa" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: 3019876543" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="cedula"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cédula</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: 123456789" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { if (!isSubmitting) { onOpenChange(false); }}}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
