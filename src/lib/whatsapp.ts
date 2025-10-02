import type { Order } from '@/types';

type NotificationType = 'created' | 'in_transit' | 'nearby' | 'delivered';

const getMessage = (type: NotificationType, order: Order): string => {
    const pharmacyName = "Droguería Avenida";
    switch (type) {
        case 'created':
            return `¡Hola ${order.client.fullName}! 👋 Hemos recibido tu pedido #${order.id.slice(-6)} de ${pharmacyName} por un total de ${order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}. Pronto estará en camino. 🛵`;
        case 'in_transit':
            const deliveryPersonName = order.assignedTo ? ` con ${order.assignedTo.name}` : '';
            return `¡Tu pedido #${order.id.slice(-6)} de ${pharmacyName} ya está en camino! 🛵 Nuestro domiciliario${deliveryPersonName} se dirige a tu ubicación: ${order.deliveryLocation.address}.`;
        case 'nearby':
            return `¡Atención! Nuestro domiciliario está cerca de tu ubicación (${order.deliveryLocation.address}) con tu pedido #${order.id.slice(-6)}. ¡Prepárate para recibirlo!`;
        case 'delivered':
            return `¡Pedido #${order.id.slice(-6)} entregado! ✅ Gracias por confiar en ${pharmacyName}. ¡Que tengas un excelente día!`;
    }
}

/**
 * Sends a notification to the client via the external message API from the server.
 * @param phone The client's phone number.
 * @param type The type of notification to send.
 * @param order The order details.
 */
export const sendWhatsAppNotification = async (phone: string, type: NotificationType, order: Order) => {
    const message = getMessage(type, order);
    const phoneDigits = phone.replace(/\D/g, '').slice(-10);

    const endpoint = 'http://149.130.175.81:3000/send-message/';

    try {
        console.log(`Sending '${type}' notification to ${phoneDigits}`);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phoneDigits, message: message })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }
        
        const responseData = await response.json();
        console.log(`Successfully sent message. API Response:`, responseData);

    } catch (error) {
        console.error('Failed to send WhatsApp notification via API:', error);
        // We don't re-throw to avoid breaking the parent process, but log it clearly.
    }
};