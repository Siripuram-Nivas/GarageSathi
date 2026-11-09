export interface Command {
  id: string;
  label: string;
  hint: string;
  to: string;
  keys?: string;
}

export const COMMANDS: Command[] = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Counts, revenue and recent jobs', to: '/', keys: 'g d' },
  { id: 'new', label: 'New voice job', hint: 'Record or upload a complaint', to: '/new', keys: 'n' },
  { id: 'jobs', label: 'Job cards', hint: 'Search, sort and update jobs', to: '/jobs', keys: 'g j' },
  { id: 'services', label: 'Service catalogue', hint: 'Prices and availability', to: '/services', keys: 'g s' },
  { id: 'settings', label: 'Garage settings', hint: 'Profile and demo controls', to: '/settings' },
];

export function filterCommands(commands: Command[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(needle));
}
