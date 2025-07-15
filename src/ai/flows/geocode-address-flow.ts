'use server';
/**
 * @fileOverview A flow for geocoding addresses using Google Maps API.
 *
 * - geocodeAddress - A function that converts a street address into geographic coordinates.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import { z } from 'zod';
import { Client, GeocodeResponse, Status } from "@googlemaps/google-maps-services-js";

const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The full street address to geocode, e.g., "Carrera 15 # 100-50, Bogotá, Colombia".'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
  lat: z.number().describe('The latitude of the address.'),
  lng: z.number().describe('The longitude of the address.'),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

const googleMapsClient = new Client({});

export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
     throw new Error("Google Maps API key is not configured.");
  }

  try {
    const response: GeocodeResponse = await googleMapsClient.geocode({
      params: {
        address: input.address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status === Status.OK && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.error('Geocoding failed:', response.data.status, response.data.error_message);
      throw new Error(`Geocoding failed for address: ${input.address}. Status: ${response.data.status}`);
    }
  } catch (error: any) {
    console.error("Error during geocoding request:", error);
    const errorMessage = error?.response?.data?.error_message || error.message || "An unknown error occurred.";
    throw new Error(`Geocoding failed: ${errorMessage}`);
  }
}
