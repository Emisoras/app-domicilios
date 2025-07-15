'use client';

import { useState } from 'react';
import type { User, Client } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { CreateClientDialog } from './create-client-dialog';
import { EditClientDialog } from './edit-client-dialog';
import { ClientHistoryDialog } from './client-history-dialog';
import { deleteClient } from '@/actions/client-actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ClientsListProps {
    initialClients: Client[];
    currentUser: User;
}

export function ClientsList({ initialClients, currentUser }: ClientsListProps) {
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [viewingHistory, setViewingHistory] = useState<Client | null>(null);
    const { toast } = useToast();

    const handleDelete = async (clientId: string) => {
        const result = await deleteClient(clientId);
        if (result.success) {
            toast({ title: "Cliente Eliminado", description: result.message });
            // The list will be updated automatically by revalidatePath
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
                        Añadir Cliente
                    </Button>
                )}
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>
                            <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialClients.map((cliente) => (
                        <TableRow key={cliente.id}>
                            <TableCell className="font-medium">{cliente.fullName}</TableCell>
                            <TableCell>{cliente.phone}</TableCell>
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
                                        <DropdownMenuItem onSelect={() => setViewingHistory(cliente)}>Ver Historial</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setEditingClient(cliente)}>Editar Cliente</DropdownMenuItem>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <DropdownMenuItem
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-destructive"
                                                >
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente
                                                    y todos sus datos asociados.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(cliente.id)}>Continuar</AlertDialogAction>
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
            <CreateClientDialog 
                open={isCreateDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
            <EditClientDialog
                open={!!editingClient}
                onOpenChange={(open) => !open && setEditingClient(null)}
                client={editingClient}
            />
            <ClientHistoryDialog
                open={!!viewingHistory}
                onOpenChange={(open) => !open && setViewingHistory(null)}
                client={viewingHistory}
            />
        </>
    );
}
