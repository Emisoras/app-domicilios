'use server';
/**
 * @fileOverview A flow for reverse geocoding coordinates using OpenRouteService API.
 *
 * - reverseGeocode - A function that converts geographic coordinates into a street address.
 * - ReverseGeocodeInput - The input type for the reverseGeocode function.
 * - ReverseGeocodeOutput - The return type for the reverseGeocode function.
 */

import { z } from 'zod';

const ReverseGeocodeInputSchema = z.object({
  lat: z.number().describe('The latitude of the location.'),
  lng: z.number().describe('The longitude of the location.'),
});
export type ReverseGeocodeInput = z.infer<typeof ReverseGeocodeInputSchema>;

const ReverseGeocodeOutputSchema = z.object({
  address: z.string().describe('The full street address for the given coordinates, e.g., "Carrera 15 # 100-50, Bogotá, Colombia".'),
});
export type ReverseGeocodeOutput = z.infer<typeof ReverseGeocodeOutputSchema>;

export async function reverseGeocode(input: ReverseGeocodeInput): Promise<ReverseGeocodeOutput> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey || apiKey === 'tu_clave_de_api') {
    throw new Error("OpenRouteService API key is not configured in .env file.");
  }

  const url = new URL('https://api.openrouteservice.org/geocode/reverse');
  url.searchParams.append('point.lon', input.lng.toString());
  url.searchParams.append('point.lat', input.lat.toString());
  url.searchParams.append('size', '1'); // We only need the top result

  try {
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 403) {
      throw new Error("OpenRouteService API error: Forbidden. Check if the API key is valid or has enough credits.");
    }

    const data = await response.json();

    if (!response.ok) {
       const errorDetails = data?.error?.message || response.statusText;
       throw new Error(`OpenRouteService API error: ${errorDetails}`);
    }

    if (data.features && data.features.length > 0) {
      // The `label` property usually contains a good, human-readable full address
      const address = data.features[0].properties.label;
      return { address };
    } else {
      throw new Error(`Reverse geocoding failed for coordinates: ${input.lat}, ${input.lng}. No results found.`);
    }
  } catch (error: any) {
    console.error("Error during OpenRouteService reverse geocoding request:", error);
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
}
