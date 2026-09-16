import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { resolveNotificationRoute, toNotificationHref } from '@/src/utils/notificationRoutes';

/**
 * `/Screen/timetable` is the historical deep-link for TIMETABLE_UPDATED.
 * The real student timetable lives at `/(tabs)/timetable`. Other logins have
 * their own timetable screens — never bounce them into the student tab layout.
 */
export default function TimetableRedirect() {
  const { role } = useAuth();
  const href = toNotificationHref(resolveNotificationRoute({ type: 'TIMETABLE_UPDATED' }, role));
  return <Redirect href={href as any} />;
}
