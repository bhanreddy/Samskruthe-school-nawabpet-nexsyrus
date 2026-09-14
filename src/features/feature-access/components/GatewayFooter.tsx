import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';

export const GatewayFooter: React.FC = () => {
  const { theme, isDark } = useTheme();
  const textMuted = theme.colors.textMuted || (isDark ? '#64748B' : '#94A3B8');

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            stroke={textMuted}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={[styles.text, { color: textMuted }]}>
          Protected by SchoolIMS Access Governance
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default React.memo(GatewayFooter);
