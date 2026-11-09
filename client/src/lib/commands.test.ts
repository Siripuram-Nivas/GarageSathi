import { describe, expect, it } from 'vitest';
import { COMMANDS, filterCommands } from './commands';

describe('command palette filtering', () => {
  it('returns every command for an empty query', () => {
    expect(filterCommands(COMMANDS, '  ')).toHaveLength(COMMANDS.length);
  });

  it('matches labels and hints case-insensitively', () => {
    expect(filterCommands(COMMANDS, 'VOICE').map((command) => command.id)).toEqual(['new']);
    expect(filterCommands(COMMANDS, 'prices').map((command) => command.id)).toEqual(['services']);
  });

  it('returns no commands when nothing matches', () => {
    expect(filterCommands(COMMANDS, 'zzzz')).toEqual([]);
  });
});
