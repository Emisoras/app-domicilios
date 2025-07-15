'use client';

import { useState } from 'react';
import type { Order, User } from '@/types';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: Order | null;
    deliveryPeople: User[];
    onAssign: (orderId: string, deliveryPerson: User) => Promise<void>;
}

export function AssignDeliveryDialog({ open, onOpenChange, order, deliveryPeople, onAssign }: AssignDeliveryDialogProps) {
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const { toast } = useToast();

    if (!order) return null;

    const handleConfirmAssignment = async () => {
        if (!selectedPersonId) {
            toast({
                variant: 'destructive',
                title: 'Selección Requerida',
                description: 'Por favor, selecciona un domiciliario para asignar el pedido.',
            });
            return;
        }

        const selectedPerson = deliveryPeople.find(p => p.id === selectedPersonId);
        if (selectedPerson) {
            setIsAssigning(true);
            try {
                await onAssign(order.id, selectedPerson);
                onOpenChange(false); // Close the dialog on success
            } catch (error) {
                // The parent component (`RoutePlanner`) is expected to show a toast on error.
                console.error("Assignment failed:", error);
            } finally {
                setIsAssigning(false);
            }
        }
    };
    
    // Reset selection when dialog is closed
    const handleOpenChangeWithReset = (isOpen: boolean) => {
        if (!isOpen) {
            setSelectedPersonId(null);
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Asignar Pedido #{order.id.slice(-6)}</DialogTitle>
                    <DialogDescription>
                        Selecciona un domiciliario para entregar este pedido.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <ScrollArea className="h-64">
                         <RadioGroup 
                            value={selectedPersonId || ''} 
                            onValueChange={setSelectedPersonId}
                            className="space-y-2 pr-4"
                        >
                            {deliveryPeople.length > 0 ? (
                                deliveryPeople.map((person) => (
                                     <Label key={person.id} htmlFor={person.id} className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                                        <RadioGroupItem value={person.id} id={person.id} />
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={person.avatarUrl} alt={person.name} />
                                            <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <span className="font-semibold">{person.name}</span>
                                          <p className="text-xs text-muted-foreground capitalize">{person.status?.replace('_', ' ')}</p>
                                        </div>
                                    </Label>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground p-8">No hay domiciliarios para seleccionar.</p>
                            )}
                        </RadioGroup>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>Cancelar</Button>
                    <Button type="button" onClick={handleConfirmAssignment} disabled={isAssigning || !selectedPersonId}>
                         {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {isAssigning ? 'Asignando...' : 'Confirmar y Notificar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
