import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Database, KeyRound, RotateCcw, Save, ShieldCheck, Volume2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { readGarage, type GarageIdentity } from '../components/Layout';
import type { AiStatus } from '../types';
import { Badge, Button, Card, ConfirmDialog, Field, Input, PageHeader, Spinner, useToast } from '../components/ui';

export default function SettingsPage() {
  const [identity, setIdentity] = useState<GarageIdentity>(readGarage);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [advancedAllowed, setAdvancedAllowed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    // Auth is opt-in. When it is off, the local operator owns the instance.
    // When it is on, only a signed-in owner may inspect provider diagnostics.
    api.auth
      .me()
      .then(() => setAdvancedAllowed(true))
      .catch((error) => setAdvancedAllowed(error instanceof ApiError && error.code === 'AUTH_DISABLED'));
  }, []);

  useEffect(() => {
    if (!advancedAllowed) return;
    api
      .aiStatus()
      .then(setAi)
      .catch((e) => push(e.message, 'error'));
  }, [advancedAllowed, push]);

  function saveIdentity() {
    localStorage.setItem('garage.identity', JSON.stringify(identity));
    window.dispatchEvent(new Event('garage-identity'));
    push('Garage profile saved locally.', 'success');
  }

  async function resetDemo() {
    setResetting(true);
    try {
      await api.resetDemo();
      setConfirmReset(false);
      push('Demo data reset. Catalogue reseeded; jobs cleared.', 'success');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Garage settings" subtitle="Your garage identity and demo controls." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-deep-aubergine font-serif">Garage profile</h2>
          <p className="mt-1 text-xs text-muted">Stored in this browser only (localStorage).</p>
          <div className="mt-4 space-y-3">
            <Field label="Garage name">
              <Input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} />
            </Field>
            <Field label="Owner / mechanic">
              <Input value={identity.owner} onChange={(e) => setIdentity({ ...identity, owner: e.target.value })} />
            </Field>
            <Field label="Contact number">
              <Input value={identity.phone} onChange={(e) => setIdentity({ ...identity, phone: e.target.value })} />
            </Field>
            <Button onClick={saveIdentity}>
              <Save size={16} /> Save profile
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-medium text-deep-aubergine font-serif">
            <RotateCcw size={15} /> Demo controls
          </h2>
          <p className="mt-1 text-xs text-muted">
            Clears job cards and reseeds the six demo services. Available only while `DEMO_MODE` is enabled on the server.
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
        </Card>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-white p-3 text-xs text-muted">
        <Volume2 size={15} className="mt-0.5 shrink-0" />
        <p>
          Voice confirmation uses Timbre v2.5 in live mode. In mock mode the player receives a clearly labelled placeholder tone — never fake speech.
        </p>
      </div>

      {advancedAllowed && (
        <details className="glass-panel mt-4 rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-medium text-deep-aubergine font-serif">Advanced / Developer diagnostics</summary>
          <p className="mt-2 text-xs text-muted">Read-only view of the backend environment. No secret values are shown.</p>
          <div className="mt-4 max-w-2xl">
            {!ai ? (
              <Spinner label="Reading provider status…" />
            ) : (
              <dl className="space-y-3 text-sm">
                <Row label="Provider mode">
                  <Badge tone={ai.mode === 'live' ? 'aubergine' : 'marigold'}>{ai.mode === 'live' ? 'LIVE GNANI AI MODE' : 'MOCK MODE'}</Badge>
                </Row>
                <Row label="API key">
                  <Badge tone={ai.gnaniConfigured ? 'aubergine' : 'red'}>
                    <KeyRound size={12} /> {ai.gnaniConfigured ? 'Configured on server' : 'Not configured'}
                  </Badge>
                </Row>
                <Row label="Database">
                  <Badge tone={ai.db === 'mongodb' ? 'aubergine' : 'neutral'}>
                    <Database size={12} /> {ai.db === 'mongodb' ? 'MongoDB' : 'Local JSON store'}
                  </Badge>
                </Row>
                <Row label="Prisma STT">
                  <span className="text-deep-aubergine">
                    {ai.stt.model} · {ai.stt.language} · {ai.stt.format}
                  </span>
                </Row>
                <Row label="Timbre TTS">
                  <span className="text-deep-aubergine">
                    {ai.tts.model} · {ai.tts.voice} · {ai.tts.language}
                  </span>
                </Row>
                <Row label="Evon">
                  <Badge tone={ai.evon === 'READY' ? 'aubergine' : 'neutral'}>{ai.evon}</Badge>
                </Row>
              </dl>
            )}
            <div className="mt-4 rounded-xl border border-border bg-white p-3 text-xs text-muted">
              <p className="flex items-center gap-1.5 font-medium text-deep-aubergine font-serif">
                <ShieldCheck size={14} /> Setup
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>Copy `.env.example` to `.env` in the repository root.</li>
                <li>Set `GNANI_API_KEY_ID` to the full GarageSathi key secret.</li>
                <li>Keep `AI_PROVIDER_MODE=mock` until you are ready to spend credits.</li>
                <li>For one deliberate live test, set mode to `live` and `ALLOW_GNANI_LIVE_TESTS=true`.</li>
                <li>Never paste the key into chat, screenshots or source files.</li>
              </ol>
            </div>
            <Link to="/ai" className="mt-3 inline-block text-xs text-marigold hover:text-amber-600">
              Open AI integration status →
            </Link>
          </div>
        </details>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        confirmLabel="Yes, reset everything"
        busy={resetting}
        onConfirm={resetDemo}
        onClose={() => setConfirmReset(false)}
      >
        <p>This deletes every saved job card and restores the demo service catalogue. It cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}