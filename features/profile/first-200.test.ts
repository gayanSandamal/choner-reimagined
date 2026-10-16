// The claim path translates Postgres exceptions into sentences a person can
// act on. The RPC raises named errors (202610061200) and each one has to land
// on its own message: "already claimed" and "not found" mean very different
// things to someone holding a code.
import { claimFirstTwoHundred } from './api';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

const rpc = supabase.rpc as unknown as jest.Mock;

describe('claimFirstTwoHundred', () => {
  beforeEach(() => rpc.mockReset());

  it('passes the code through, trimmed', async () => {
    rpc.mockResolvedValue({ data: { ok: true, first_name: 'Dinesh' }, error: null });
    const result = await claimFirstTwoHundred('  f2-8esuv5  ');
    expect(rpc).toHaveBeenCalledWith('claim_prelaunch', { p_code: 'f2-8esuv5' });
    expect(result).toEqual({ ok: true, firstName: 'Dinesh' });
  });

  it('never asks the server about an empty box', async () => {
    const result = await claimFirstTwoHundred('   ');
    expect(rpc).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('survives a success with no name on the registration', async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(claimFirstTwoHundred('F2-ABC123')).resolves.toEqual({ ok: true, firstName: null });
  });

  it.each([
    ['code_not_found', 'not_found'],
    ['code_already_claimed', 'already_claimed'],
    ['not_authenticated', 'not_signed_in']
  ])('turns %s into %s', async (raised, reason) => {
    rpc.mockResolvedValue({ data: null, error: { message: `${raised} (SQLSTATE P0001)` } });
    const result = await claimFirstTwoHundred('F2-ABC123');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(reason);
      expect(result.message.length).toBeGreaterThan(10);
    }
  });

  it('does not blame the person for a network failure', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch' } });
    const result = await claimFirstTwoHundred('F2-ABC123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown');
  });

  it('keeps every refusal about the code, never the person', async () => {
    for (const raised of ['code_not_found', 'code_already_claimed']) {
      rpc.mockResolvedValue({ data: null, error: { message: raised } });
      const result = await claimFirstTwoHundred('F2-ABC123');
      if (!result.ok) expect(result.message).not.toMatch(/\byou (are|aren't|were)\b/i);
    }
  });
});
