import { router } from 'expo-router';
import { AuthService } from './authService';
import { clearStaffPortalSession, getStaffPortalSession } from './staffPortalSession';

const ADMIN_ROLES = new Set(['admin', 'principal']);

function roleCodeOf(session: Awaited<ReturnType<typeof AuthService.getSession>>): string | undefined {
  const role = session?.validatedUser?.role;
  if (typeof role === 'object' && role !== null) return (role as { code?: string }).code;
  return typeof role === 'string' ? role : undefined;
}

/** Stop impersonating a staff portal and restore the signed-in admin identity. */
export async function endStaffPortalAccess(): Promise<void> {
  const actorUserId = getStaffPortalSession().actorUserId;
  clearStaffPortalSession();

  const session = await AuthService.getSession();
  const currentUserId = session?.validatedUser?.userId;
  const roleCode = roleCodeOf(session);

  if (actorUserId && currentUserId && actorUserId !== currentUserId) {
    const restored = await AuthService.switchAccount(actorUserId);
    if (!restored.session) {
      await AuthService.refreshSession();
    }
    return;
  }

  if (roleCode && !ADMIN_ROLES.has(roleCode)) {
    await AuthService.refreshSession();
  }
}

/**
 * Leave a Manage Staff "open portal" visit and return to the admin staff list.
 */
export async function exitStaffPortalToAdmin(): Promise<void> {
  await endStaffPortalAccess();
  router.replace('/admin/manage-staff' as any);
}
