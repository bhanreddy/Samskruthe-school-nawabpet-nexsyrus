import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { resolveNotificationRoute, toNotificationHref } from '@/src/utils/notificationRoutes';

/**
 * ACCESS_RESPONSE used to deep-link to `/Screen/access`, which was never a
 * real route and always opened the unmatched-route screen.
 */
export default function AccessResponseRedirect() {
  const { role } = useAuth();
  const href = toNotificationHref(resolveNotificationRoute({ type: 'ACCESS_RESPONSE' }, role));
  return <Redirect href={href as any} />;
}
