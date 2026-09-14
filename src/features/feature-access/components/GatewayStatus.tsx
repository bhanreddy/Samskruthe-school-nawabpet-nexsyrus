import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { FeatureAccessState } from '../types';

interface GatewayStatusProps {
  eyebrow: string;
  title: string;
  description: string;
  state?: FeatureAccessState;
  requiredPlanName?: string;
}

export const GatewayStatus: React.FC<GatewayStatusProps> = ({
  eyebrow,
  title,
  description,
  state = FeatureAccessState.PLAN_REQUIRED,
  requiredPlanName,
}) => {
  const { theme, isDark } = useTheme();

  // Eyebrow accent color according to access state
  let eyebrowAccent = theme.colors.primary || '#3B82F6';
  let eyebrowBg = isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)';
  let eyebrowBorder = isDark ? 'rgba(59,130,246,0.30)' : 'rgba(59,130,246,0.22)';

  if (state === FeatureAccessState.FEATURE_DISABLED || state === FeatureAccessState.PERMISSION_DENIED) {
    eyebrowAccent = isDark ? '#F87171' : '#DC2626';
    eyebrowBg = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';
    eyebrowBorder = isDark ? 'rgba(239,68,68,0.30)' : 'rgba(239,68,68,0.22)';
  } else if (state === FeatureAccessState.COMING_SOON || state === FeatureAccessState.BETA) {
    eyebrowAccent = isDark ? '#FBBF24' : '#D97706';
    eyebrowBg = isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)';
    eyebrowBorder = isDark ? 'rgba(245,158,11,0.30)' : 'rgba(245,158,11,0.22)';
  } else if (state === FeatureAccessState.INVALID_ROUTE) {
    eyebrowAccent = isDark ? '#94A3B8' : '#64748B';
    eyebrowBg = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.08)';
    eyebrowBorder = isDark ? 'rgba(148,163,184,0.30)' : 'rgba(148,163,184,0.22)';
  }

  const textPrimary = theme.colors.textPrimary || (isDark ? '#F8FAFC' : '#0F172A');
  const textSecondary = theme.colors.textSecondary || (isDark ? '#94A3B8' : '#64748B');

  return (
    <View style={styles.container}>
      {/* Eyebrow Pill */}
      <View
        style={[
          styles.eyebrowPill,
          {
            backgroundColor: eyebrowBg,
            borderColor: eyebrowBorder,
          },
        ]}
      >
        <Text style={[styles.eyebrowText, { color: eyebrowAccent }]}>
          {eyebrow.toUpperCase()}
        </Text>
      </View>

      {/* Main Title */}
      <Text
        style={[styles.title, { color: textPrimary }]}
        accessibilityRole="header"
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>

      {/* Description Subtitle */}
      <Text
        style={[styles.description, { color: textSecondary }]}
        maxFontSizeMultiplier={1.25}
      >
        {description}
      </Text>

      {/* Required Plan Indicator Tag if relevant */}
      {requiredPlanName && state === FeatureAccessState.PLAN_REQUIRED ? (
        <View style={styles.planBadgeContainer}>
          <Text style={[styles.planBadgeText, { color: eyebrowAccent }]}>
            Available on {requiredPlanName} Plan
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  eyebrowPill: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 33,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 380,
    fontWeight: '400',
  },
  planBadgeContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(GatewayStatus);
