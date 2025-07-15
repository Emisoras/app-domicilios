'use client';

import type { Order } from '@/types';

type NotificationType = 'created' | 'in_transit' | 'nearby' | 'delivered';

const getMessage = (type: NotificationType, order: Order): string => {
    const pharmacyName = "Droguería Avenida";
    switch (type) {
        case 'created':
            return `¡Hola ${order.client.fullName}! 👋 Hemos recibido tu pedido #${order.id.slice(-6)} de ${pharmacyName} por un total de ${order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}. Pronto estará en camino. 🛵`;
        case 'in_transit':
            return `¡Tu pedido #${order.id.slice(-6)} de ${pharmacyName} ya está en camino! 🛵 Nuestro domiciliario se dirige a tu ubicación: ${order.deliveryLocation.address}.`;
        case 'nearby':
            return `¡Atención! Nuestro domiciliario está cerca de tu ubicación (${order.deliveryLocation.address}) con tu pedido #${order.id.slice(-6)}. ¡Prepárate para recibirlo!`;
        case 'delivered':
            return `¡Pedido #${order.id.slice(-6)} entregado! ✅ Gracias por confiar en ${pharmacyName}. ¡Que tengas un excelente día!`;
    }
}

/**
 * Opens a new WhatsApp chat window to send a notification to the client.
 * @param phone The client's phone number. Assumes Colombian numbers.
 * @param type The type of notification to send.
 * @param order The order details.
 */
export const sendWhatsAppNotification = (phone: string, type: NotificationType, order: Order) => {
    const message = getMessage(type, order);
    // Ensure the phone number starts with the country code 57 for Colombia
    const fullPhone = phone.startsWith('57') ? phone : `57${phone}`;
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    
    // In a real application, this could be an API call to a WhatsApp Business service.
    // For this prototype, we simulate the agent's action by opening a new tab.
    window.open(whatsappUrl, '_blank');
};
