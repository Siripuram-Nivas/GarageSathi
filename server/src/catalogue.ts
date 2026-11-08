import { ServiceDoc } from './db/types';

type Seed = Omit<ServiceDoc, 'id' | 'createdAt' | 'updatedAt'>;

// Demonstration prices only — verify real market prices before production use.
export const SERVICE_SEEDS: Seed[] = [
  {
    name: 'Battery Inspection',
    description: 'Battery voltage, terminals and charging check.',
    aliases: ['battery', 'battery check', 'బ్యాటరీ', 'battary', 'batri'],
    pricePaise: 10_000,
    category: 'Electrical',
    isActive: true,
  },
  {
    name: 'Engine Oil Change',
    description: 'Drain and refill engine oil (oil cost extra if not included).',
    aliases: ['engine oil', 'oil change', 'oil marpu', 'ఆయిల్', 'ఇంజిన్ ఆయిల్', 'ఆయిల్ మార్పు'],
    pricePaise: 45_000,
    category: 'Engine',
    isActive: true,
  },
  {
    name: 'Brake Inspection',
    description: 'Brake shoe, cable and drum inspection.',
    aliases: ['brake', 'brakes', 'brake check', 'బ్రేక్', 'brek'],
    pricePaise: 15_000,
    category: 'Safety',
    isActive: true,
  },
  {
    name: 'Puncture Repair',
    description: 'Tube puncture removal and patch.',
    aliases: ['puncture', 'puncher', 'flat tyre', 'flat tire', 'పంక్చర్', 'టైర్ పంక్చర్'],
    pricePaise: 8_000,
    category: 'Tyre',
    isActive: true,
  },
  {
    name: 'Chain Cleaning and Lubrication',
    description: 'Chain clean, lube and tension adjustment.',
    aliases: ['chain cleaning', 'chain lube', 'chain lubrication', 'chain', 'చైన్', 'చెయిన్'],
    pricePaise: 12_000,
    category: 'Drivetrain',
    isActive: true,
  },
  {
    name: 'General Service',
    description: 'Basic 20-point service check.',
    aliases: ['general service', 'full service', 'complete service', 'servicing', 'bike service', 'vehicle service', 'సర్వీస్'],
    pricePaise: 60_000,
    category: 'General',
    isActive: true,
  },
];

export const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,!?;:"'()[\]{}\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const levenshtein = (a: string, b: string) => {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
};

export interface ServiceMatch {
  serviceId: string;
  serviceName: string;
  confidence: number;
  matchedTerm: string;
  lowConfidence: boolean;
}

/** Alias matching with a deliberately small fuzzy step. Never guesses a price. */
export function matchServices(text: string, services: ServiceDoc[]): ServiceMatch[] {
  const haystack = ` ${normalize(text)} `;
  const matches: ServiceMatch[] = [];

  for (const service of services.filter((s) => s.isActive)) {
    let best: ServiceMatch | null = null;
    const terms = [service.name, ...service.aliases];

    for (const term of terms) {
      const needle = normalize(term);
      if (!needle) continue;
      if (haystack.includes(` ${needle} `) || haystack.includes(` ${needle}s `) || haystack.includes(needle) && /[\u0C00-\u0C7F]/.test(needle)) {
        const confidence = term === service.name ? 0.9 : 0.95;
        if (!best || confidence > best.confidence) {
          best = { serviceId: service.id, serviceName: service.name, confidence, matchedTerm: term, lowConfidence: false };
        }
        continue;
      }
      // Fuzzy: one edit on a long single-word alias, e.g. "battrey" → "battery".
      if (needle.includes(' ') || needle.length < 5) continue;
      const tokens = haystack.trim().split(' ');
      const fuzzyHit = tokens.find(
        (token) => token !== needle && Math.abs(token.length - needle.length) <= 1 && levenshtein(token, needle) === 1,
      );
      if (fuzzyHit && !best) {
        best = { serviceId: service.id, serviceName: service.name, confidence: 0.72, matchedTerm: fuzzyHit, lowConfidence: true };
      }
    }

    if (best && best.confidence >= 0.7) matches.push(best);
  }

  return matches;
}

interface TermHint {
  test: RegExp;
  label: string;
  symptom?: string;
}

const TERM_HINTS: TermHint[] = [
  { test: /(start avvat|start avva|start avvatledu|start avvatam|not starting|no start|self start|kick start|స్టార్ట్)/i, label: 'Vehicle not starting', symptom: 'Vehicle not starting' },
  { test: /(mileage|average|మైలేజ్)/i, label: 'Low mileage', symptom: 'Low mileage' },
  { test: /(clutch|క్లచ్)/i, label: 'Clutch adjustment (not in catalogue)' },
  { test: /(spark plug|స్పార్క్ ప్లగ్)/i, label: 'Spark plug replacement (not in catalogue)' },
  { test: /(horn|హార్న్)/i, label: 'Horn repair (not in catalogue)' },
  { test: /(headlight|head light|indicator|light|లైట్)/i, label: 'Headlight / indicator repair (not in catalogue)' },
  { test: /(wiring|వైరింగ్)/i, label: 'Wiring repair (not in catalogue)' },
  { test: /(carburetor|carburettor|కార్బ్యురేటర్)/i, label: 'Carburettor cleaning (not in catalogue)' },
  { test: /(suspension|shock absorber|సస్పెన్షన్)/i, label: 'Suspension work (not in catalogue)' },
  { test: /(oil filter|ఆయిల్ ఫిల్టర్)/i, label: 'Oil filter replacement (not in catalogue)' },
  { test: /(air filter|ఎయిర్ ఫిల్టర్)/i, label: 'Air filter replacement (not in catalogue)' },
  { test: /(coolant|కూలెంట్)/i, label: 'Coolant top-up (not in catalogue)' },
  { test: /(wash|washing|వాష్)/i, label: 'Washing (not in catalogue)' },
  { test: /(sprocket|స్ప్రాకెట్)/i, label: 'Chain sprocket replacement (not in catalogue)' },
  { test: /(tyre replacement|new tyre|new tire|టైర్ మార్చ)/i, label: 'Tyre replacement (not in catalogue)' },
  { test: /(dent|denting|paint|painting|డెంట్)/i, label: 'Denting / painting (not in catalogue)' },
  { test: /(vibration|vibrat|వైబ్రేషన్)/i, label: 'Vibration', symptom: 'Vibration reported' },
  { test: /(sound|noise|శబ్దం|సద్దు)/i, label: 'Abnormal noise', symptom: 'Abnormal noise' },
  { test: /(smoke|పొగ)/i, label: 'Smoke from engine', symptom: 'Smoke reported' },
];

export function findTerms(text: string) {
  const symptoms: string[] = [];
  const unresolved: string[] = [];
  for (const hint of TERM_HINTS) {
    if (!hint.test.test(text)) continue;
    if (hint.symptom) symptoms.push(hint.symptom);
    else unresolved.push(hint.label);
  }
  return { symptoms: [...new Set(symptoms)], unresolvedItems: [...new Set(unresolved)] };
}

const VEHICLES: Array<{ make: string; models: string[] }> = [
  { make: 'Honda', models: ['activa', 'activa 6g', 'activa 5g', 'dio', 'shine', 'sp 125', 'unicorn'] },
  { make: 'Hero', models: ['splendor', 'splendor plus', 'passion', 'glamour', 'xtreme', 'hf deluxe'] },
  { make: 'Bajaj', models: ['pulsar', 'pulsar 150', 'platina', 'discover', 'chetak'] },
  { make: 'TVS', models: ['jupiter', 'ntorq', 'apache', 'apache rtr', 'xl100', 'scooty'] },
  { make: 'Yamaha', models: ['fz', 'fz-s', 'r15', 'mt 15', 'ray', 'fascino'] },
  { make: 'Suzuki', models: ['access', 'access 125', 'burgman', 'gixxer'] },
  { make: 'Royal Enfield', models: ['classic 350', 'bullet', 'hunter 350', 'himalayan'] },
];

export function detectVehicle(text: string) {
  const haystack = normalize(text);
  for (const vehicle of VEHICLES) {
    const model = vehicle.models.find((m) => haystack.includes(normalize(m)));
    if (model) return { make: vehicle.make, model: model.replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
  const make = VEHICLES.find((v) => haystack.includes(normalize(v.make)));
  return { make: make?.make ?? '', model: '' };
}
