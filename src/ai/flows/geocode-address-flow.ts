'use server';
/**
 * @fileOverview A flow for geocoding addresses using OpenRouteService API.
 *
 * - geocodeAddress - A function that converts a street address into geographic coordinates.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import { z } from 'zod';

const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The full street address to geocode, e.g., "Carrera 15 # 100-50, Bogotá, Colombia".'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
  lat: z.number().describe('The latitude of the address.'),
  lng: z.number().describe('The longitude of the address.'),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey || apiKey === 'tu_clave_de_api') {
    throw new Error("OpenRouteService API key is not configured in .env file.");
  }

  const url = new URL('https://api.openrouteservice.org/geocode/search');
  url.searchParams.append('text', input.address);
  // Focus search around Ocaña to improve results
  url.searchParams.append('focus.point.lon', '-73.358425'); 
  url.searchParams.append('focus.point.lat', '8.250876');
  // Add a boundary to limit the search area to roughly the region of Ocaña
  url.searchParams.append('boundary.country', 'COL');
  url.searchParams.append('layers', 'address,street');


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
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    } else {
      throw new Error(`Geocoding failed for address: ${input.address}. No results found.`);
    }
  } catch (error: any) {
    console.error("Error during OpenRouteService geocoding request:", error);
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}
