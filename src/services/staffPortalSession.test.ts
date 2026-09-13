import { shouldAttachStaffPortalHeader, setStaffPortalSession, clearStaffPortalSession } from './staffPortalSession';

describe('staffPortalSession header policy', () => {
  afterEach(() => {
    clearStaffPortalSession();
  });

  it('does not attach the impersonation header to auth identity endpoints', () => {
    setStaffPortalSession('staff-1', 'Teacher', 'user-staff', 'user-admin');
    expect(shouldAttachStaffPortalHeader('/auth/validate-school-user')).toBe(false);
    expect(shouldAttachStaffPortalHeader('/auth/contexts')).toBe(false);
    expect(shouldAttachStaffPortalHeader('/staff/me/profile')).toBe(true);
  });

  it('does not attach a header when no staff portal session is active', () => {
    expect(shouldAttachStaffPortalHeader('/staff/me/profile')).toBe(false);
  });
});
