
'use server';
/**
 * @fileOverview An AI flow for optimizing pharmacy delivery routes using OpenRouteService API.
 *
 * - optimizePharmacyRoute - A function that calculates the most efficient route for a list of orders.
 * - OptimizeRouteInput - The input type for the optimizePharmacyRoute function.
 * - OptimizeRouteOutput - The return type for the optimizePharmacyRoute function.
 */

import { z } from 'zod';
import { geocodeAddress } from './geocode-address-flow';

const AddressSchema = z.string().describe('The full address, e.g., "Street Name #123, City, State, Country".');

const OrderStopSchema = z.object({
  orderId: z.string().describe('The unique identifier for the order.'),
  address: AddressSchema.describe('The delivery address for this order.'),
});
export type OrderStop = z.infer<typeof OrderStopSchema>;

const OptimizeRouteInputSchema = z.object({
  startCoords: z.object({
    lat: z.number(),
    lng: z.number(),
  }).describe("The starting coordinates (latitude and longitude) for the route."),
  orders: z.array(OrderStopSchema).describe('A list of orders that need to be delivered.'),
});
export type OptimizeRouteInput = z.infer<typeof OptimizeRouteInputSchema>;

const OptimizedRouteStopSchema = z.object({
    orderId: z.string().describe('The ID of the order at this stop.'),
    stopNumber: z.number().describe('The sequential position of this stop in the optimized route (starting from 1).'),
});

const OptimizeRouteOutputSchema = z.object({
  optimizedRoute: z.array(OptimizedRouteStopSchema).describe('An ordered list of stops representing the most efficient route.'),
  estimatedTime: z.string().describe('Estimated total travel time for the route, in a human-readable format (e.g., "45 minutes").'),
  estimatedDistance: z.string().describe('Estimated total travel distance for the route, in a human-readable format (e.g., "15 km").'),
  encodedPolyline: z.string().describe('The encoded polyline string for the entire optimized route path.'),
});
export type OptimizeRouteOutput = z.infer<typeof OptimizeRouteOutputSchema>;


export async function optimizePharmacyRoute(input: OptimizeRouteInput): Promise<OptimizeRouteOutput> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey || apiKey === 'tu_clave_de_api') {
    throw new Error("OpenRouteService API key is not configured in .env file.");
  }
  
  if (input.orders.length === 0) {
      return {
          optimizedRoute: [],
          estimatedTime: "0 minutes",
          estimatedDistance: "0 km",
          encodedPolyline: "",
      };
  }

  try {
    // 1. Geocode all order addresses to get coordinates
    const startCoords = input.startCoords; // Use coordinates directly
    const orderCoordsPromises = input.orders.map(async (order) => ({
      orderId: order.orderId,
      coords: await geocodeAddress({ address: order.address })
    }));
    const orderCoords = await Promise.all(orderCoordsPromises);
    
    // Ensure we have valid coordinates before proceeding
    const validOrderCoords = orderCoords.filter(order => order.coords && typeof order.coords.lat === 'number' && typeof order.coords.lng === 'number');

    if (validOrderCoords.length === 0) {
        throw new Error("No valid coordinates could be found for any of the orders.");
    }


    // 2. Prepare the request for OpenRouteService Optimization API
    const requestBody = {
      jobs: validOrderCoords.map((order, index) => ({
        id: index, // Use index as job ID
        location: [order.coords.lng, order.coords.lat],
        service: 300, // Service time at location in seconds (e.g., 5 minutes)
      })),
      vehicles: [{
        id: 1,
        profile: 'driving-car', // or 'cycling-regular', 'foot-walking'
        start: [startCoords.lng, startCoords.lat],
        // The 'end' property is intentionally omitted to finish at the last stop
        capacity: [100], // Example capacity, can be adjusted
      }],
      options: {
        g: true // To get the geometry
      }
    };
    
    const url = 'https://api.openrouteservice.org/optimization';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 403) {
      throw new Error("OpenRouteService API error: Forbidden. Check if the API key is valid or has enough credits.");
    }
    
    const data = await response.json();
    
    if (!response.ok) {
       const errorDetails = data?.error?.message || `Status: ${response.status} ${response.statusText}`;
       throw new Error(`OpenRouteService API error: ${errorDetails}`);
    }
    
    // The optimization endpoint returns 'routes' which is an array, but we only have one vehicle, so we take the first.
    if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        const optimizedRouteStops = route.steps
          .filter((step: any) => step && step.type === 'job' && validOrderCoords[step.job_id])
          .map((step: any, index: number) => {
            const originalOrderIndex = step.job_id;
            const originalOrder = validOrderCoords[originalOrderIndex];
            return {
              orderId: originalOrder.orderId,
              stopNumber: index + 1,
            };
        });
        
        // Correctly access data from the route object itself, not a summary
        const totalDistanceMeters = route.distance;
        const totalDurationSeconds = route.duration;
        const encodedPolyline = route.geometry;
        
        const estimatedDistance = `${(totalDistanceMeters / 1000).toFixed(1)} km`;
        const estimatedTime = `${Math.round(totalDurationSeconds / 60)} minutes`;
        
        return {
            optimizedRoute: optimizedRouteStops,
            estimatedDistance,
            estimatedTime,
            encodedPolyline,
        };
    } else if (data.unassigned && data.unassigned.length > 0) {
        const unassignedReason = data.unassigned[0].reason;
        throw new Error(`Could not optimize route. Some orders were unassigned. Reason: ${unassignedReason}`);
    }
    else {
        throw new Error("Could not optimize route. The API response did not contain a valid route.");
    }

  } catch(error: any) {
    console.error("Error during route optimization request:", error);
    throw new Error(`Route optimization failed: ${error.message}`);
  }
}
