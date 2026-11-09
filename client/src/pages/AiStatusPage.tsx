import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { fileToWav } from '../lib/audio';
import type { AiStatus } from '../types';
import { Badge, Button, Card, Field, PageHeader, Spinner, useToast } from '../components/ui';

type SmokeResult = Awaited<ReturnType<typeof api.smokeTest>>;

export default function AiStatusPage() {
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SmokeResult | null>(null);
  const { push } = useToast();

  useEffect(() => {
    api
      .aiStatus()
      .then(setAi)
      .catch((e) => setError(e.message));
  }, []);

  async function runSmokeTest() {
    if (!file) {
      push('Choose a short Telugu-English WAV clip first.', 'error');
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const wav = await fileToWav(file);
      const response = await api.smokeTest(wav.blob);
      setResult(response);
      push('Live smoke test completed. One STT and one TTS request were sent.', 'success');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setRunning(false);
    }
  }

  if (error) return <Card className="p-8 text-center text-rose-600">{error}</Card>;
  if (!ai) return <Spinner label="Checking Gnani integration readiness…" />;

  const liveReady = ai.mode === 'live' && ai.gnaniConfigured && ai.allowLiveTests;

  return (
    <div>
      <PageHeader
        title="AI integration status"
        subtitle="What the backend will call, and whether live mode is actually enabled."
        actions={<Badge tone={ai.mode === 'live' ? 'aubergine' : 'marigold'}>{ai.mode === 'live' ? 'LIVE GNANI AI MODE' : 'MOCK MODE'}</Badge>}
      />

      {ai.notes.length > 0 && (
        <div className="mb-4 space-y-2">
          {ai.notes.map((note) => (
            <div key={note} className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
              <Info size={16} className="mt-0.5 shrink-0" /> {note}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ProviderCard
          title="Gnani Prisma"
          subtitle="Speech to text"
          ready={ai.gnaniConfigured}
          rows={[
            ['Endpoint', `POST ${ai.stt.endpoint}`],
            ['Model', ai.stt.model],
            ['Language candidates', ai.stt.language],
            ['Format', ai.stt.format],
            ['Keyterms + topic', ai.stt.keyterms ? 'Enabled' : 'Disabled'],
          ]}
          footer="Unverified live. A successful request has not been recorded in this build."
        />
        <ProviderCard
          title="Gnani Timbre"
          subtitle="Telugu speech"
          ready={ai.gnaniConfigured}
          rows={[
            ['Endpoint', `POST ${ai.tts.endpoint}`],
            ['Model', ai.tts.model],
            ['Voice', ai.tts.voice],
            ['Language', ai.tts.language],
            ['Voices accepted', ai.tts.voices.join(', ')],
          ]}
          footer="Unverified live. Mock mode returns a labelled tone, not speech."
        />
        <ProviderCard
          title="Gnani Evon v3.3"
          subtitle="Optional reasoning"
          ready={ai.evon === 'READY'}
          rows={[
            ['Status', ai.evon],
            ['Deployment', 'Remote OpenAI-compatible endpoint only'],
            ['Authority', 'Never prices or approves jobs'],
          ]}
          footer="No hosted internship API. Disabled by default; deterministic extraction is authoritative."
        />
      </div>

      <Card className="mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-deep-aubergine font-serif">
          <FlaskConical size={16} /> One-time live smoke test
        </h2>
        <p className="mt-1 text-xs text-muted">
          Sends exactly one Prisma request and one Timbre request. It consumes programme credits and must be enabled deliberately.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Short Telugu-English clip (≤30s)" hint="Uploaded audio is decoded and converted to WAV; it is not stored.">
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-border bg-white p-2 text-sm text-deep-aubergine file:mr-3 file:rounded-lg file:border-0 file:bg-ice-silver file:px-3 file:py-1.5 file:text-deep-aubergine"
              />
            </Field>
            <Button onClick={runSmokeTest} loading={running} disabled={!liveReady}>
              Run one live test
            </Button>
            {!liveReady && (
              <p className="flex items-start gap-2 text-xs text-marigold">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                Disabled. Requires AI_PROVIDER_MODE=live, a configured key and ALLOW_GNANI_LIVE_TESTS=true.
              </p>
            )}
            <p className="text-xs text-muted">
              After testing, set ALLOW_GNANI_LIVE_TESTS=false again to avoid accidental spend.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-white p-4">
            {!result ? (
              <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
                <AlertTriangle size={18} />
                No live result yet. Nothing has been sent to Gnani in this session.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-deep-aubergine">
                <p className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={16} /> Smoke test returned
                </p>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Transcript</p>
                  <p className="mt-1 rounded-lg border border-border p-2">{result.stt.transcript}</p>
                  <p className="mt-1 text-xs text-muted">
                    {result.stt.detectedLanguage || 'language not reported'} · request {result.stt.requestId || 'n/a'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Timbre audio</p>
                  <p className="mt-1 rounded-lg border border-border p-2">
                    {result.tts.bytes} bytes of {result.tts.contentType} returned.
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    The smoke-test response no longer embeds audio. Play a confirmation from a saved job card to listen.
                  </p>
                </div>
                <p className="text-xs text-muted">{result.note}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProviderCard({
  title,
  subtitle,
  ready,
  rows,
  footer,
}: {
  title: string;
  subtitle: string;
  ready: boolean;
  rows: Array<[string, string]>;
  footer: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-medium text-deep-aubergine">{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <Badge tone={ready ? 'aubergine' : 'marigold'}>{ready ? 'CONFIGURED' : 'NOT CONFIGURED'}</Badge>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0">
            <dt className="text-muted">{label}</dt>
            <dd className="max-w-[70%] break-words text-right text-deep-aubergine">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">{footer}</p>
    </Card>
  );
}