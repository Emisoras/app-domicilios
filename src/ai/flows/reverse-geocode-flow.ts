'use server';
/**
 * @fileOverview A flow for reverse geocoding coordinates using Google Maps API.
 *
 * - reverseGeocode - A function that converts geographic coordinates into a street address.
 * - ReverseGeocodeInput - The input type for the reverseGeocode function.
 * - ReverseGeocodeOutput - The return type for the reverseGeocode function.
 */

import { z } from 'zod';
import { Client, ReverseGeocodeResponse, Status } from "@googlemaps/google-maps-services-js";

const ReverseGeocodeInputSchema = z.object({
  lat: z.number().describe('The latitude of the location.'),
  lng: z.number().describe('The longitude of the location.'),
});
export type ReverseGeocodeInput = z.infer<typeof ReverseGeocodeInputSchema>;

const ReverseGeocodeOutputSchema = z.object({
  address: z.string().describe('The full street address for the given coordinates, e.g., "Carrera 15 # 100-50, Bogotá, Colombia".'),
});
export type ReverseGeocodeOutput = z.infer<typeof ReverseGeocodeOutputSchema>;

const googleMapsClient = new Client({});

export async function reverseGeocode(input: ReverseGeocodeInput): Promise<ReverseGeocodeOutput> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is not configured.");
  }

  try {
    const response: ReverseGeocodeResponse = await googleMapsClient.reverseGeocode({
      params: {
        latlng: { latitude: input.lat, longitude: input.lng },
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.status === Status.OK && response.data.results.length > 0) {
      // Return the first, most specific result
      return {
        address: response.data.results[0].formatted_address,
      };
    } else {
       console.error('Reverse geocoding failed:', response.data.status, response.data.error_message);
       throw new Error(`Reverse geocoding failed for coordinates: ${input.lat}, ${input.lng}. Status: ${response.data.status}`);
    }
  } catch (error: any) {
     console.error("Error during reverse geocoding request:", error);
     const errorMessage = error?.response?.data?.error_message || error.message || "An unknown error occurred.";
     throw new Error(`Reverse geocoding failed: ${errorMessage}`);
  }
}
