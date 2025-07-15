'use client';

import { useState } from 'react';
import type { User, DeliveryStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateDeliveryPersonDialog } from './create-delivery-person-dialog';
import { EditDeliveryPersonDialog } from './edit-delivery-person-dialog';
import { DeliveryPersonHistoryDialog } from './delivery-person-history-dialog';
import { deleteUser } from '@/actions/user-actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusConfig: Record<DeliveryStatus, { text: string, variant: BadgeProps['variant'] }> = {
    available: { text: "Disponible", variant: 'success' },
    in_route: { text: "En Ruta", variant: 'accent' },
    offline: { text: "Desconectado", variant: 'outline' },
};

function StatusBadge({ status }: { status?: DeliveryStatus }) {
    if (!status) return null;
    const config = statusConfig[status] || statusConfig.offline;
    return <Badge variant={config.variant}>{config.text}</Badge>;
}

interface DeliveryPeopleListProps {
    initialDeliveryPeople: User[];
    currentUser: User;
}

export function DeliveryPeopleList({ initialDeliveryPeople, currentUser }: DeliveryPeopleListProps) {
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<User | null>(null);
    const [viewingHistory, setViewingHistory] = useState<User | null>(null);
    const { toast } = useToast();

    const handleDelete = async (userId: string) => {
        const result = await deleteUser(userId);
        if (result.success) {
            toast({ title: "Domiciliario Eliminado", description: result.message });
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.message });
        }
    };
    
    return (
        <>
            <div className="text-right mb-4">
                 {currentUser.role === 'admin' && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <PlusCircle className="mr-2" />
                        Añadir Domiciliario
                    </Button>
                )}
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Perfil</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Ruta Activa</TableHead>
                        <TableHead>
                            <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialDeliveryPeople.map((domiciliario) => (
                        <TableRow key={domiciliario.id}>
                                <TableCell>
                                <Avatar>
                                    <AvatarImage src={domiciliario.avatarUrl} alt={domiciliario.name} />
                                    <AvatarFallback>{domiciliario.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{domiciliario.name}</TableCell>
                            <TableCell>{domiciliario.phone}</TableCell>
                            <TableCell><StatusBadge status={domiciliario.status} /></TableCell>
                            <TableCell>{domiciliario.activeRoute || 'N/A'}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => setEditingPerson(domiciliario)}>
                                            Editar Domiciliario
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled>Asignar Ruta</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setViewingHistory(domiciliario)}>Ver Historial</DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Esto eliminará permanentemente al domiciliario.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(domiciliario.id)}>Continuar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <CreateDeliveryPersonDialog 
                open={isCreateDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
            <EditDeliveryPersonDialog
                open={!!editingPerson}
                onOpenChange={(open) => !open && setEditingPerson(null)}
                person={editingPerson}
            />
            <DeliveryPersonHistoryDialog
                open={!!viewingHistory}
                onOpenChange={(open) => !open && setViewingHistory(null)}
                person={viewingHistory}
            />
        </>
    );
}
