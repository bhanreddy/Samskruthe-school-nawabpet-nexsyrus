import { Router } from 'expo-router';
import { GatewayAction, FeatureAccessResponse } from '../types';
import { FeatureAccessApi } from '../services/featureAccessApi';
import { showAlert } from '../../../components/CustomAlert';
import { getHomeRouteForRole } from '../../../utils/portalRoutes';
import * as Haptics from '../../../utils/haptics';

export interface ExecuteGatewayActionOptions {
  action: GatewayAction;
  featureKey: string;
  resolution: FeatureAccessResponse | null;
  router: Router;
  user: any;
  onStateChange?: (patch: { requested?: boolean; subscribed?: boolean }) => void;
  onRetry?: () => Promise<void> | void;
}

export async function executeGatewayAction({
  action,
  featureKey,
  resolution,
  router,
  user,
  onStateChange,
  onRetry,
}: ExecuteGatewayActionOptions): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const roleCode =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as any).code
      : user?.role || 'student';

  switch (action.type) {
    case 'UPGRADE_PLAN': {
      if (['admin', 'principal'].includes(roleCode)) {
        router.push('/admin/subscription' as any);
      } else {
        showAlert({
          type: 'info',
          title: 'Plan Upgrade',
          message: 'Contact your school administrator to enable this capability on the institution plan.',
        });
      }
      break;
    }

    case 'ASK_ADMIN':
    case 'REQUEST_ACCESS':
    case 'REQUEST_EARLY_ACCESS': {
      try {
        const userName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.display_name ||
          user?.email ||
          undefined;

        const res = await FeatureAccessApi.requestAccess(featureKey, {
          userName,
          message: action.type === 'REQUEST_EARLY_ACCESS' ? 'Requested pilot beta access' : undefined,
        });

        onStateChange?.({ requested: true });

        if (res.alreadyRequested) {
          showAlert({
            type: 'info',
            title: 'Request Already Pending',
            message: 'Your school administrator has already been notified and will review your request.',
          });
        } else {
          showAlert({
            type: 'success',
            title: 'Request Sent',
            message: 'Your access request was successfully sent to the school administration.',
          });
        }
      } catch (err: any) {
        showAlert({
          type: 'error',
          title: 'Unable to Send Request',
          message: err?.message || 'Please check your internet connection and retry.',
        });
      }
      break;
    }

    case 'NOTIFY_ME': {
      try {
        const res = await FeatureAccessApi.notifyMe(featureKey);
        onStateChange?.({ subscribed: true });
        showAlert({
          type: 'success',
          title: res.alreadySubscribed ? 'Already Subscribed' : "You're On The List",
          message: res.message,
        });
      } catch (err: any) {
        showAlert({
          type: 'error',
          title: 'Subscription Failed',
          message: err?.message || 'Could not register notification preference.',
        });
      }
      break;
    }

    case 'GO_BACK': {
      if (router.canGoBack()) {
        router.back();
      } else {
        const homeRoute = getHomeRouteForRole(roleCode);
        router.replace(homeRoute as any);
      }
      break;
    }

    case 'GO_HOME': {
      const homeRoute = getHomeRouteForRole(roleCode);
      router.replace(homeRoute as any);
      break;
    }

    case 'RETRY': {
      if (onRetry) {
        await onRetry();
      } else if (router.canGoBack()) {
        router.replace(router as any);
      }
      break;
    }

    case 'CONTACT_SUPPORT': {
      if (['admin', 'principal'].includes(roleCode)) {
        router.push('/admin/helpdesk' as any);
      } else {
        showAlert({
          type: 'info',
          title: 'Support',
          message: 'Please reach out to your school administrative office for assistance.',
        });
      }
      break;
    }

    default:
      console.warn(`[gatewayActionEngine] Unhandled action type: ${action.type}`);
      break;
  }
}
