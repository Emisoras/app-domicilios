'use client';

import { useState, useEffect } from 'react';
import type { User, Role } from '@/types';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

interface ChangeRoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    onRoleChanged: (userId: string, newRole: Role) => void;
}

const roles: { id: Role, name: string, description: string }[] = [
    { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema.' },
    { id: 'agent', name: 'Agente', description: 'Gestiona pedidos, clientes y domiciliarios.' },
    { id: 'delivery', name: 'Domiciliario', description: 'Solo ve sus rutas y cuadre de caja.' },
];

export function ChangeRoleDialog({ open, onOpenChange, user, onRoleChanged }: ChangeRoleDialogProps) {
    const [selectedRole, setSelectedRole] = useState<Role | undefined>(user?.role);
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
            setSelectedRole(user.role);
        }
    }, [user]);
    
    if (!user) return null;
    
    const handleSave = () => {
        if (selectedRole) {
            onRoleChanged(user.id, selectedRole);
            toast({
                title: "Rol Actualizado",
                description: `El rol de ${user.name} ha sido cambiado a ${roles.find(r => r.id === selectedRole)?.name || selectedRole}.`,
            });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
                    <DialogDescription>
                        Selecciona el nuevo rol para <strong>{user.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <RadioGroup 
                        value={selectedRole} 
                        onValueChange={(value: Role) => setSelectedRole(value)}
                        className="space-y-2"
                    >
                        {roles.map((role) => (
                             <Label key={role.id} htmlFor={role.id} className="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                                <RadioGroupItem value={role.id} id={role.id} />
                                <div className="grid gap-1.5">
                                    <div className="font-semibold">{role.name}</div>
                                    <p className="text-sm text-muted-foreground">{role.description}</p>
                                </div>
                            </Label>
                        ))}
                    </RadioGroup>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button type="button" onClick={handleSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
