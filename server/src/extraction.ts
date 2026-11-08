import { ServiceDoc } from './db/types';
import { detectVehicle, findTerms, matchServices } from './catalogue';

export interface Extraction {
  detectedLanguage: string;
  vehicleMake: string;
  vehicleModel: string;
  customerComplaint: string;
  symptoms: string[];
  matchedServices: Array<{
    serviceId: string;
    serviceName: string;
    confidence: number;
    matchedTerm: string;
    lowConfidence: boolean;
  }>;
  unresolvedItems: string[];
}

export function detectLanguage(text: string) {
  const telugu = /[\u0C00-\u0C7F]/.test(text);
  const latin = /[a-z]/i.test(text);
  if (telugu && latin) return 'te-IN,en-IN (code-mixed)';
  if (telugu) return 'te-IN';
  return 'en-IN';
}

/**
 * Deterministic extraction: no model approval, no prices, no diagnosis.
 * Evon (optional) may enrich vehicle fields in the route; services stay here.
 */
export function extract(transcript: string, services: ServiceDoc[]): Extraction {
  const text = transcript.trim();
  const vehicle = detectVehicle(text);
  const { symptoms, unresolvedItems } = findTerms(text);
  return {
    detectedLanguage: detectLanguage(text),
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    customerComplaint: text,
    symptoms,
    matchedServices: matchServices(text, services),
    unresolvedItems,
  };
}
