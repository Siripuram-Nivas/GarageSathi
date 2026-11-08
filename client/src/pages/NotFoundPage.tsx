import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-ink-600">404</p>
      <h1 className="text-xl font-semibold text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-400">The page you asked for does not exist. Head back to the garage dashboard.</p>
      <Link to="/">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
