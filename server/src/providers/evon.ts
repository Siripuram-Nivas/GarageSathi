import { config, evonStatus } from '../config';

export interface EvonEnrichment {
  vehicleMake?: string;
  vehicleModel?: string;
  symptoms?: string[];
}

/**
 * Optional adapter for a self-hosted OpenAI-compatible Evon endpoint.
 * Returns { used:false } on any problem so the deterministic path always wins.
 */
export async function evonExtract(transcript: string): Promise<{ used: boolean; data?: EvonEnrichment }> {
  if (evonStatus() !== 'READY') return { used: false };
  try {
    const res = await fetch(`${config.evon.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.evon.apiKey ? { Authorization: `Bearer ${config.evon.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.evon.model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Extract vehicle make, model and symptoms from a two-wheeler garage complaint. Reply ONLY with JSON: {"vehicleMake":string,"vehicleModel":string,"symptoms":string[]}. Never invent prices or services.',
          },
          { role: 'user', content: transcript },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { used: false };
    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { used: false };
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    return {
      used: true,
      data: {
        vehicleMake: typeof parsed.vehicleMake === 'string' ? parsed.vehicleMake.slice(0, 40) : undefined,
        vehicleModel: typeof parsed.vehicleModel === 'string' ? parsed.vehicleModel.slice(0, 40) : undefined,
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.filter((s: unknown) => typeof s === 'string').slice(0, 10) : [],
      },
    };
  } catch {
    return { used: false };
  }
}
