import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';

interface GatewayBenefitsProps {
  benefits: string[];
}

export const GatewayBenefits: React.FC<GatewayBenefitsProps> = ({ benefits = [] }) => {
  const { theme, isDark } = useTheme();

  if (!benefits || benefits.length === 0) {
    return null;
  }

  const primaryColor = theme.colors.primary || '#3B82F6';
  const cardBg = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.85)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textPrimary = theme.colors.textPrimary || (isDark ? '#F1F5F9' : '#1E293B');

  return (
    <View style={styles.container}>
      {benefits.map((benefit, index) => (
        <View
          key={`benefit-${index}-${benefit.slice(0, 12)}`}
          style={[
            styles.benefitRow,
            {
              backgroundColor: cardBg,
              borderColor,
            },
          ]}
        >
          {/* Checkmark Icon Container */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.10)',
              },
            ]}
          >
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 13l4 4L19 7"
                stroke={primaryColor}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Benefit Text */}
          <Text
            style={[styles.benefitText, { color: textPrimary }]}
            maxFontSizeMultiplier={1.2}
          >
            {benefit}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 10,
    maxWidth: 440,
    alignSelf: 'center',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
  },
});

export default React.memo(GatewayBenefits);
