import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { FeatureAccessGateway } from './FeatureAccessGateway';
import { FeatureAccessState } from '../types';
import { useTheme } from '../../../hooks/useTheme';

export interface FeatureRouteGuardProps {
  /**
   * The permanent feature key to enforce access for.
   */
  feature: string;

  /**
   * Child components to render when access is ALLOWED.
   */
  children: React.ReactNode;

  /**
   * Optional custom fallback component when access is blocked.
   */
  fallback?: React.ReactNode;

  /**
   * Optional loading placeholder component.
   */
  loadingComponent?: React.ReactNode;
}

export const FeatureRouteGuard: React.FC<FeatureRouteGuardProps> = ({
  feature,
  children,
  fallback,
  loadingComponent,
}) => {
  const { allowed, state, resolution, loading, refresh } = useFeatureAccess(feature);
  const { theme, isDark } = useTheme();

  // If already allowed (from cache or server), render immediately with zero delay
  if (allowed) {
    return <>{children}</>;
  }

  // If initial load in progress and no resolution yet, show minimal non-flashing spinner
  if (loading && !resolution) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary || '#3B82F6'} />
      </View>
    );
  }

  // If custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Render Universal Feature Access Gateway
  return (
    <FeatureAccessGateway
      featureKey={feature}
      resolution={resolution}
      forcedState={state}
      onRetry={refresh}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(FeatureRouteGuard);
