import {
  ALL_NOTIFICATION_PORTALS,
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_ROUTES,
  notificationPortalForRole,
  parseNotificationHref,
  pushNotificationRoute,
  resolveNotificationRoute,
  toNotificationHref,
} from './notificationRoutes';

describe('notificationPortalForRole', () => {
  it('maps every login family onto a portal', () => {
    expect(notificationPortalForRole('student')).toBe('parent');
    expect(notificationPortalForRole('parent')).toBe('parent');
    expect(notificationPortalForRole('teacher')).toBe('staff');
    expect(notificationPortalForRole('staff')).toBe('staff');
    expect(notificationPortalForRole('principal')).toBe('admin');
    expect(notificationPortalForRole('admin')).toBe('admin');
    expect(notificationPortalForRole('accountant')).toBe('accounts');
    expect(notificationPortalForRole('driver')).toBe('driver');
    expect(notificationPortalForRole('gate_keeper')).toBe('gatekeeper');
    expect(notificationPortalForRole('applicant')).toBe('applicant');
  });
});

describe('parseNotificationHref', () => {
  it('keeps query values out of the pathname', () => {
    expect(parseNotificationHref('/Screen/calendar?eventId=abc-123')).toEqual({
      pathname: '/Screen/calendar',
      params: { eventId: 'abc-123' },
    });
  });

  it('strips custom schemes used by old device payloads', () => {
    expect(parseNotificationHref('testapp://Screen/fees')).toEqual({
      pathname: '/Screen/fees',
      params: {},
    });
  });
});

describe('resolveNotificationRoute', () => {
  it('does not glue query strings onto the pathname', () => {
    const resolved = resolveNotificationRoute(
      { type: 'CALENDAR_EVENT_PUBLISHED', deepLink: '/Screen/calendar?eventId=evt-1' },
      'parent',
    );
    expect(resolved?.pathname).toBe('/Screen/calendar');
    expect(resolved?.params).toEqual({ eventId: 'evt-1' });
    expect(toNotificationHref(resolved).startsWith('/Screen/calendar?')).toBe(true);
  });

  it('rewrites the missing /Screen/access path for accounts', () => {
    expect(resolveNotificationRoute(
      { type: 'ACCESS_RESPONSE', deepLink: '/Screen/access' },
      'accountant',
    )?.pathname).toBe('/accounts/dashboard');
  });

  it('sends results to the real screen for each login', () => {
    expect(resolveNotificationRoute({ type: 'RESULT_RELEASED', deepLink: '/results' }, 'parent')?.pathname)
      .toBe('/(tabs)/results');
    expect(resolveNotificationRoute({ type: 'RESULT_RELEASED', deepLink: '/results' }, 'staff')?.pathname)
      .toBe('/staff/results');
    expect(resolveNotificationRoute({ type: 'RESULT_RELEASED', deepLink: '/results' }, 'admin')?.pathname)
      .toBe('/admin/exams');
    expect(resolveNotificationRoute({ type: 'RESULT_RELEASED', deepLink: '/results' }, 'accountant')?.pathname)
      .toBe('/accounts/exams');
  });

  it('does not send staff or admin timetable taps through student tabs', () => {
    expect(resolveNotificationRoute({ type: 'TIMETABLE_UPDATED', deepLink: '/Screen/timetable' }, 'staff')?.pathname)
      .toBe('/staff/timetable');
    expect(resolveNotificationRoute({ type: 'TIMETABLE_UPDATED', deepLink: '/Screen/timetable' }, 'admin')?.pathname)
      .toBe('/admin/timetable');
    expect(resolveNotificationRoute({ type: 'TIMETABLE_UPDATED', deepLink: '/Screen/timetable' }, 'parent')?.pathname)
      .toBe('/(tabs)/timetable');
  });

  it('keeps a role-correct messenger deep link', () => {
    expect(resolveNotificationRoute(
      { type: 'MESSAGE_RECEIVED', deepLink: '/admin/messages' },
      'admin',
    )?.pathname).toBe('/admin/messages');
    expect(resolveNotificationRoute(
      { type: 'MESSAGE_RECEIVED', deepLink: '/Screen/messages' },
      'teacher',
    )?.pathname).toBe('/staff/messages');
  });

  it('opens calendar on the matching portal and keeps eventId', () => {
    expect(resolveNotificationRoute(
      { type: 'CALENDAR_EVENT_PUBLISHED', deepLink: '/Screen/calendar?eventId=9' },
      'staff',
    )).toEqual({ pathname: '/staff/calendar', params: { eventId: '9' } });
    expect(resolveNotificationRoute(
      { type: 'HOLIDAY_ANNOUNCED', deepLink: '/Screen/calendar?eventId=9' },
      'driver',
    )?.pathname).toBe('/driver/calendar');
    expect(resolveNotificationRoute(
      { type: 'CALENDAR_EVENT_REMINDER', deepLink: '/Screen/calendar' },
      'gate_keeper',
    )?.pathname).toBe('/gatekeeper/calendar');
  });

  it('routes payroll, leave, helpdesk and visitor types to the owning portal', () => {
    expect(resolveNotificationRoute({ type: 'PAYROLL_SUCCESS' }, 'driver')?.pathname).toBe('/driver/payslip');
    expect(resolveNotificationRoute({ type: 'LEAVE_APPROVED' }, 'staff')?.pathname).toBe('/staff/leaves');
    expect(resolveNotificationRoute({ type: 'LEAVE_SUBMITTED' }, 'admin')?.pathname).toBe('/admin/leaves');
    expect(resolveNotificationRoute({ type: 'SUPPORT_TICKET_CREATED' }, 'admin')?.pathname).toBe('/admin/helpdesk');
    expect(resolveNotificationRoute({ type: 'SUPPORT_TICKET_REPLIED' }, 'parent')?.pathname).toBe('/Screen/helpdesk');
    expect(resolveNotificationRoute({ type: 'DELIVERY_RECEIVED' }, 'gatekeeper')?.pathname).toBe('/gatekeeper/deliveries');
    expect(resolveNotificationRoute({ type: 'VISITOR_REQUEST_APPROVED' }, 'parent')?.pathname).toBe('/Screen/visitorPass');
  });

  it('falls back to that login home instead of an unmatched path', () => {
    expect(resolveNotificationRoute({ type: 'UNKNOWN_EVENT', deepLink: '/does/not/exist' }, 'admin')?.pathname)
      .toBe('/admin/dashboard');
    expect(resolveNotificationRoute({ deepLink: '/Screen/access' }, 'accountant')?.pathname)
      .toBe('/accounts/dashboard');
  });

  it('pushes pathname and params separately so Expo Router can match the file', () => {
    const push = jest.fn();
    pushNotificationRoute({ push }, {
      pathname: '/staff/calendar',
      params: { eventId: 'evt-1' },
    });
    expect(push).toHaveBeenCalledWith({
      pathname: '/staff/calendar',
      params: { eventId: 'evt-1' },
    });
  });

  it('resolves a real existing screen for every type in every login', () => {
    const valid = [
      /^\/\(tabs\)\//,
      /^\/Screen\//,
      /^\/staff\//,
      /^\/admin\//,
      /^\/accounts\//,
      /^\/driver\//,
      /^\/gatekeeper\//,
      /^\/admission\//,
      /^\/updates$/,
    ];
    const roles = {
      parent: 'parent',
      staff: 'staff',
      admin: 'admin',
      accounts: 'accountant',
      driver: 'driver',
      gatekeeper: 'gate_keeper',
      applicant: 'applicant',
    } as const;

    for (const type of ALL_NOTIFICATION_TYPES) {
      expect(NOTIFICATION_TYPE_ROUTES[type]).toBeTruthy();
      for (const portal of ALL_NOTIFICATION_PORTALS) {
        const resolved = resolveNotificationRoute({ type, deepLink: '/Screen/missing-on-purpose' }, roles[portal]);
        expect(resolved?.pathname).toBeTruthy();
        expect(valid.some((pattern) => pattern.test(resolved!.pathname))).toBe(true);
      }
    }
  });
});
