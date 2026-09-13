import { executePopupAction, resolvePopupRoute } from './popupActionRegistry';
import { createSessionId, isPopupStillValid, nextPopup, sortPopupQueue } from './popupQueue';
import type { EligiblePopup } from './types';

describe('popup queue', () => {
  const sample = (id: string, priority: EligiblePopup['priority'], start: string): EligiblePopup => ({
    id,
    title: id,
    message: 'msg',
    category: 'INFORMATION',
    priority,
    layout_type: 'STANDARD',
    frequency: 'SHOW_ONCE',
    start_at: start,
    allow_dismiss: true,
    require_acknowledgement: false,
    update_mode: 'NONE',
    buttons: [],
  });

  it('orders critical before high before normal before low', () => {
    const ranked = sortPopupQueue([
      sample('n', 'NORMAL', '2026-09-11T10:00:00Z'),
      sample('c', 'CRITICAL', '2026-09-11T12:00:00Z'),
      sample('h', 'HIGH', '2026-09-11T08:00:00Z'),
      sample('l', 'LOW', '2026-09-11T07:00:00Z'),
    ]).map((p) => p.id);
    expect(ranked).toEqual(['c', 'h', 'n', 'l']);
  });

  it('never returns more than one next popup', () => {
    const queue = sortPopupQueue([
      sample('a', 'CRITICAL', '2026-09-11T10:00:00Z'),
      sample('b', 'HIGH', '2026-09-11T10:00:00Z'),
    ]);
    expect(nextPopup(queue)?.id).toBe('a');
    expect(nextPopup(queue, 'a')?.id).toBe('b');
    expect(nextPopup(queue.filter((p) => p.id !== 'a' && p.id !== 'b'), 'b')).toBeNull();
  });

  it('drops popups that expired while the app was open', () => {
    const expired = sample('x', 'CRITICAL', '2026-09-01T00:00:00Z');
    expired.end_at = '2026-09-10T00:00:00Z';
    expect(isPopupStillValid(expired, new Date('2026-09-11T00:00:00Z'))).toBe(false);
  });

  it('creates a fresh session id for every login', () => {
    expect(createSessionId()).not.toEqual(createSessionId());
  });
});

describe('popup action registry', () => {
  it('maps OPEN_FEES to the parent fee screen and blocks driver access', () => {
    expect(resolvePopupRoute({
      id: '1', label: 'View Fees', actionType: 'OPEN_MODULE', target: 'OPEN_FEES',
    }, 'parent')).toBe('/Screen/fees');
    expect(resolvePopupRoute({
      id: '1', label: 'View Fees', actionType: 'OPEN_MODULE', target: 'OPEN_FEES',
    }, 'driver')).toBeNull();
  });

  it('rejects raw admin paths disguised as action targets', () => {
    expect(resolvePopupRoute({
      id: '1', label: 'Hack', actionType: 'OPEN_MODULE', target: '../../AdminUsers',
    }, 'parent')).toBeNull();
  });

  it('treats dismiss and acknowledge as non-navigation results', async () => {
    await expect(executePopupAction({ id: 'd', label: 'Later', actionType: 'DISMISS' }, 'parent'))
      .resolves.toEqual({ kind: 'dismiss' });
    await expect(executePopupAction({ id: 'a', label: 'OK', actionType: 'ACKNOWLEDGE' }, 'staff'))
      .resolves.toEqual({ kind: 'acknowledge' });
  });
});
