import React from 'react';
import {
  FeatureAccessGateway,
  FeatureAccessState,
} from '../src/features/feature-access';

/**
 * +not-found.tsx
 *
 * Catches genuine unmatched routes in Expo Router.
 * Per architectural specification, this is strictly separated from
 * feature access/plan restrictions.
 */
export default function NotFoundScreen() {
  return (
    <FeatureAccessGateway
      forcedState={FeatureAccessState.INVALID_ROUTE}
      customTitle="Page Not Found"
      customDescription="The screen or resource you requested could not be located on the school platform."
    />
  );
}
