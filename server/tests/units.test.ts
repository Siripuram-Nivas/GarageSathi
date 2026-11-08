import { describe, expect, it } from 'vitest';
import { SERVICE_SEEDS, matchServices, detectVehicle, findTerms } from '../src/catalogue';
import { ServiceDoc } from '../src/db/types';
import { buildEstimate } from '../src/pricing';
import { extract } from '../src/extraction';
import { inspectWav, mockToneWav } from '../src/wav';
import { numberToTelugu, rupeesToTeluguWords, buildConfirmationText } from '../src/telugu';

const catalogue: ServiceDoc[] = SERVICE_SEEDS.map((s, i) => ({
  ...s,
  id: `svc-${i}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}));
const idOf = (name: string) => catalogue.find((s) => s.name === name)!.id;

describe('catalogue matching', () => {
  it('matches Telugu-English service aliases', () => {
    const text = 'Anna naa Activa start avvatledu. Battery check cheyyandi, engine oil kuda change cheyyali.';
    const matches = matchServices(text, catalogue).map((m) => m.serviceName).sort();
    expect(matches).toEqual(['Battery Inspection', 'Engine Oil Change']);
  });

  it('matches Telugu script aliases', () => {
    const matches = matchServices('బ్రేక్ చెక్ చేయండి, చైన్ క్లీనింగ్ కూడా', catalogue);
    expect(matches.map((m) => m.serviceName).sort()).toEqual(['Brake Inspection', 'Chain Cleaning and Lubrication']);
  });

  it('does not match unrelated text', () => {
    expect(matchServices('Good morning, tea kavali', catalogue)).toEqual([]);
  });

  it('flags unknown service terms and detects vehicles', () => {
    expect(findTerms('clutch sagging and horn not working').unresolvedItems.length).toBe(2);
    expect(detectVehicle('naa Pulsar start avvatledu')).toEqual({ make: 'Bajaj', model: 'Pulsar' });
  });

  it('reports code-mixed language and complaint', () => {
    const result = extract('అన్నా, naa Activa start avvatledu. Battery check cheyyandi.', catalogue);
    expect(result.detectedLanguage).toBe('te-IN,en-IN (code-mixed)');
    expect(result.vehicleMake).toBe('Honda');
    expect(result.customerComplaint).toContain('Activa');
    expect(result.symptoms).toContain('Vehicle not starting');
  });
});

describe('pricing', () => {
  it('calculates line totals and total in paise on the server', () => {
    const estimate = buildEstimate(
      [
        { serviceId: idOf('Battery Inspection'), quantity: 1 },
        { serviceId: idOf('Engine Oil Change'), quantity: 2 },
      ],
      catalogue,
    );
    expect(estimate.serviceItems[0]).toMatchObject({ unitPricePaise: 10_000, lineTotalPaise: 10_000 });
    expect(estimate.serviceItems[1].lineTotalPaise).toBe(90_000);
    expect(estimate.estimateTotalPaise).toBe(100_000);
  });

  it('clamps quantities to 1..20', () => {
    const estimate = buildEstimate([{ serviceId: idOf('Puncture Repair'), quantity: 99 }], catalogue);
    expect(estimate.serviceItems[0].quantity).toBe(20);
  });

  it('rejects unknown services instead of guessing a price', () => {
    expect(() => buildEstimate([{ serviceId: 'made-up', quantity: 1 }], catalogue)).toThrowError(/catalogue/i);
  });
});

describe('audio validation', () => {
  it('accepts a real PCM WAV and reports duration', () => {
    const info = inspectWav(mockToneWav());
    expect(info.sampleRate).toBe(16_000);
    expect(info.durationSec).toBeLessThan(3);
  });

  it('rejects a renamed non-WAV buffer', () => {
    expect(() => inspectWav(Buffer.from('this is not audio'))).toThrowError(/WAV/);
  });
});

describe('Telugu confirmation', () => {
  it('speaks numbers in Telugu words', () => {
    expect(numberToTelugu(650)).toBe('ఆరు వందల యాభై');
    expect(rupeesToTeluguWords(65_000)).toBe('ఆరు వందల యాభై రూపాయలు');
  });

  it('builds a job confirmation with job number and amount', () => {
    const text = buildConfirmationText({ jobId: 'GS-1001', estimateTotalPaise: 65_000 });
    expect(text).toContain('GS-1001');
    expect(text).toContain('ఆరు వందల యాభై రూపాయలు');
  });
});
