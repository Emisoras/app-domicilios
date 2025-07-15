'use server';
/**
 * @fileOverview An AI flow for optimizing pharmacy delivery routes using Google Maps Directions API.
 *
 * - optimizePharmacyRoute - A function that calculates the most efficient route for a list of orders.
 * - OptimizeRouteInput - The input type for the optimizePharmacyRoute function.
 * - OptimizeRouteOutput - The return type for the optimizePharmacyRoute function.
 */

import { z } from 'zod';
import { Client, DirectionsResponse, TravelMode, Status } from "@googlemaps/google-maps-services-js";


const AddressSchema = z.string().describe('The full address, e.g., "Street Name #123, City, State, Country".');

const OrderStopSchema = z.object({
  orderId: z.string().describe('The unique identifier for the order.'),
  address: AddressSchema.describe('The delivery address for this order.'),
});
export type OrderStop = z.infer<typeof OrderStopSchema>;

const OptimizeRouteInputSchema = z.object({
  startAddress: AddressSchema.describe("The starting address for the route, typically the pharmacy's location."),
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

const googleMapsClient = new Client({});

export async function optimizePharmacyRoute(input: OptimizeRouteInput): Promise<OptimizeRouteOutput> {
  if (input.orders.length === 0) {
      return {
          optimizedRoute: [],
          estimatedTime: "0 minutes",
          estimatedDistance: "0 km",
          encodedPolyline: "",
      };
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is not configured.");
  }

  try {
    const waypoints = input.orders.map(order => order.address);
    // The destination is the last waypoint in the unoptimized list.
    // The optimizer will determine the actual last stop.
    const destination = waypoints[waypoints.length - 1];
    
    const response: DirectionsResponse = await googleMapsClient.directions({
        params: {
            origin: input.startAddress,
            destination: destination, 
            waypoints: waypoints,
            optimize: true, // This is the key for TSP optimization
            mode: TravelMode.driving,
            key: process.env.GOOGLE_MAPS_API_KEY,
        }
    });

    if (response.data.status === Status.OK && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const waypointOrder = route.waypoint_order; // This gives the optimized order of indices

        // Map the optimized waypoint order back to our order IDs
        const orderedStops: OrderStop[] = waypointOrder.map(index => input.orders[index]);
        const optimizedRoute = orderedStops.map((stop, index) => ({
            orderId: stop.orderId,
            stopNumber: index + 1,
        }));
        
        // Calculate total distance and time from all legs
        const totalDistanceMeters = route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
        const totalDurationSeconds = route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);

        const estimatedDistance = `${(totalDistanceMeters / 1000).toFixed(1)} km`;
        const estimatedTime = `${Math.round(totalDurationSeconds / 60)} minutes`;
        const encodedPolyline = route.overview_polyline.points;
        
        return {
            optimizedRoute,
            estimatedDistance,
            estimatedTime,
            encodedPolyline,
        };
    } else {
        console.error('Directions API failed:', response.data.status, response.data.error_message);
        throw new Error(`Could not optimize route. Status: ${response.data.status}`);
    }

  } catch(error: any) {
    console.error("Error during route optimization request:", error);
    const errorMessage = error?.response?.data?.error_message || error.message || "An unknown error occurred.";
    throw new Error(`Route optimization failed: ${errorMessage}`);
  }
}
