import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Database, KeyRound, RotateCcw, Save, ShieldCheck, Volume2 } from 'lucide-react';
import { api } from '../lib/api';
import { readGarage, type GarageIdentity } from '../components/Layout';
import type { AiStatus } from '../types';
import { Badge, Button, Card, ConfirmDialog, Field, Input, PageHeader, Spinner, useToast } from '../components/ui';

export default function SettingsPage() {
  const [identity, setIdentity] = useState<GarageIdentity>(readGarage);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    api
      .aiStatus()
      .then(setAi)
      .catch((e) => push(e.message, 'error'));
  }, [push]);

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
      <PageHeader title="Garage settings" subtitle="Identity, AI mode and demo controls. Secrets never appear in this page." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-slate-200">Garage profile</h2>
          <p className="mt-1 text-xs text-slate-500">Stored in this browser only (localStorage).</p>
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
          <h2 className="text-sm font-medium text-slate-200">AI configuration</h2>
          <p className="mt-1 text-xs text-slate-500">Read-only view of the backend environment.</p>
          {!ai ? (
            <Spinner label="Reading provider status…" />
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Provider mode">
                <Badge tone={ai.mode === 'live' ? 'teal' : 'amber'}>{ai.mode === 'live' ? 'LIVE GNANI AI MODE' : 'MOCK MODE'}</Badge>
              </Row>
              <Row label="API key">
                <Badge tone={ai.gnaniConfigured ? 'teal' : 'red'}>
                  <KeyRound size={12} /> {ai.gnaniConfigured ? 'Configured on server' : 'Not configured'}
                </Badge>
              </Row>
              <Row label="Database">
                <Badge tone={ai.db === 'mongodb' ? 'teal' : 'neutral'}>
                  <Database size={12} /> {ai.db === 'mongodb' ? 'MongoDB' : 'Local JSON store'}
                </Badge>
              </Row>
              <Row label="Prisma STT">
                <span className="text-slate-300">
                  {ai.stt.model} · {ai.stt.language} · {ai.stt.format}
                </span>
              </Row>
              <Row label="Timbre TTS">
                <span className="text-slate-300">
                  {ai.tts.model} · {ai.tts.voice} · {ai.tts.language}
                </span>
              </Row>
              <Row label="Evon">
                <Badge tone={ai.evon === 'READY' ? 'teal' : 'neutral'}>{ai.evon}</Badge>
              </Row>
            </dl>
          )}
          <div className="mt-4 rounded-xl border border-ink-600 bg-ink-900/50 p-3 text-xs text-slate-400">
            <p className="flex items-center gap-1.5 font-medium text-slate-300">
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
          <Link to="/ai" className="mt-3 inline-block text-xs text-teal-300 hover:text-teal-200">
            Open AI integration status →
          </Link>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <RotateCcw size={15} /> Demo controls
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Clears job cards and reseeds the six demo services. Available only while `DEMO_MODE` is enabled on the server.
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
        </Card>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-ink-600 bg-ink-850/60 p-3 text-xs text-slate-400">
        <Volume2 size={15} className="mt-0.5 shrink-0" />
        <p>
          Voice confirmation uses Timbre v2.5 in live mode. In mock mode the player receives a clearly labelled placeholder tone — never fake speech.
        </p>
      </div>

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
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
