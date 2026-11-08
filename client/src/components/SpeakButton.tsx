import { useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Button, useToast } from './ui';

export function SpeakButton({ jobId, label = 'Play Telugu confirmation' }: { jobId: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [mock, setMock] = useState<boolean | null>(null);
  const { push } = useToast();

  async function play() {
    setLoading(true);
    try {
      const { blob, mock: isMock } = await api.speak(jobId);
      setMock(isMock);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (error) {
      push((error as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={play} loading={loading}>
        {loading ? <Volume2 size={16} /> : <Play size={16} />} {label}
      </Button>
      {mock === true && (
        <p className="text-xs text-amber-300">
          Mock audio: a placeholder tone, not Gnani speech. <Badge tone="amber">MOCK</Badge>
        </p>
      )}
      {mock === false && <p className="text-xs text-teal-300">Real Gnani Timbre audio (Telugu, timbre-v2.5).</p>}
    </div>
  );
}
