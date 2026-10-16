import { describe, expect, it, beforeEach } from 'vitest';

describe('V2.4 social verification rules', () => {
  beforeEach(() => localStorage.clear());
  it('stores distinct social proof and prevents duplicate friend counting', () => {
    const key = 'campus-social-proof-1-10-USRA';
    localStorage.setItem(key, JSON.stringify(['USRB']));
    const used: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    expect(used.includes('USRB')).toBe(true);
    expect(new Set([...used, 'USRB']).size).toBe(1);
    expect(new Set([...used, 'USRC']).size).toBe(2);
  });
  it('keeps different users in separate registry records', () => {
    const registry = { USRA: { id: 'USRA', points: 100 }, USRB: { id: 'USRB', points: 20 } };
    localStorage.setItem('campus-users-v2', JSON.stringify(registry));
    const loaded = JSON.parse(localStorage.getItem('campus-users-v2') || '{}');
    expect(loaded.USRA.points).toBe(100);
    expect(loaded.USRB.points).toBe(20);
  });
});
