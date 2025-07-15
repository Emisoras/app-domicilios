'use client';

import { useState } from 'react';
import type { User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateAgentDialog } from './create-agent-dialog';
import { EditAgentDialog } from './edit-agent-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteUser } from '@/actions/user-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface AgentsListProps {
    initialAgents: User[];
    currentUser: User;
}

export function AgentsList({ initialAgents, currentUser }: AgentsListProps) {
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<User | null>(null);
    const { toast } = useToast();

    const handleDelete = async (userId: string) => {
        const result = await deleteUser(userId);
        if (result.success) {
            toast({ title: "Agente Eliminado", description: result.message });
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
                        Añadir Agente
                    </Button>
                )}
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Perfil</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>
                            <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialAgents.map((agent) => (
                        <TableRow key={agent.id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                                    <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{agent.name}</TableCell>
                            <TableCell>{agent.cedula}</TableCell>
                            <TableCell>{agent.phone}</TableCell>
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
                                        <DropdownMenuItem onSelect={() => setEditingAgent(agent)}>
                                            Editar Agente
                                        </DropdownMenuItem>
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
                                                        Esta acción no se puede deshacer. Esto eliminará permanentemente al agente.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(agent.id)}>Continuar</AlertDialogAction>
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

            <CreateAgentDialog 
                open={isCreateDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
            <EditAgentDialog
                open={!!editingAgent}
                onOpenChange={(open) => !open && setEditingAgent(null)}
                agent={editingAgent}
            />
        </>
    );
}
