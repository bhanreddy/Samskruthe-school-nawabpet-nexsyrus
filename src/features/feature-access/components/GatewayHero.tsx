import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
  Path,
  Rect,
  G,
  Line,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { HeroArchetype } from '../types';
import { useTheme } from '../../../hooks/useTheme';
import { GatewayDurations, GatewayEasings } from '../motion/gatewayMotion';

interface GatewayHeroProps {
  archetype: HeroArchetype;
  isStatic?: boolean;
  size?: number;
}

export const GatewayHero: React.FC<GatewayHeroProps> = ({
  archetype = 'ORBIT',
  isStatic = false,
  size = 190,
}) => {
  const { theme, isDark } = useTheme();

  // Subtle ambient transforms
  const floatY = useSharedValue(0);
  const breatheScale = useSharedValue(1);
  const subtleRotate = useSharedValue(0);

  useEffect(() => {
    if (isStatic) return;

    // 1. Gentle vertical float (-3px to +3px over ~8 seconds)
    floatY.value = withRepeat(
      withTiming(3.5, {
        duration: GatewayDurations.heroFloat,
        easing: GatewayEasings.gentle,
      }),
      -1,
      true
    );

    // 2. Slow breathing scale (0.985 to 1.015 over ~10.5 seconds)
    breatheScale.value = withRepeat(
      withTiming(1.02, {
        duration: GatewayDurations.heroBreathe,
        easing: GatewayEasings.gentle,
      }),
      -1,
      true
    );

    // 3. Very subtle rotation (-1.5deg to 1.5deg over ~12 seconds)
    subtleRotate.value = withRepeat(
      withTiming(1.5, {
        duration: GatewayDurations.heroSpin * 0.55,
        easing: GatewayEasings.gentle,
      }),
      -1,
      true
    );
  }, [isStatic, floatY, breatheScale, subtleRotate]);

  const animatedHeroStyle = useAnimatedStyle(() => {
    if (isStatic) return {};
    return {
      transform: [
        { translateY: floatY.value },
        { scale: breatheScale.value },
        { rotate: `${subtleRotate.value}deg` },
      ],
    };
  });

  // Palette tokens
  const primaryColor = theme.colors.primary || '#3B82F6';
  const accentColor = isDark ? '#60A5FA' : '#2563EB';
  const ringStroke = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(30,41,59,0.12)';
  const ringSoft = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(30,41,59,0.06)';
  const coreGlow = isDark ? 'rgba(96,165,250,0.35)' : 'rgba(37,99,235,0.22)';
  const cardFill = isDark ? '#131C2D' : '#FFFFFF';

  const renderArchetypeSvg = () => {
    switch (archetype) {
      case 'LENS':
        return (
          <G>
            {/* Concentric aperture rings */}
            <Circle cx="95" cy="95" r="82" stroke={ringSoft} strokeWidth="1.5" strokeDasharray="3 3" />
            <Circle cx="95" cy="95" r="70" stroke={ringStroke} strokeWidth="2" />
            <Circle cx="95" cy="95" r="54" stroke={ringSoft} strokeWidth="1" />
            <Circle cx="95" cy="95" r="38" stroke={accentColor} strokeWidth="2" strokeOpacity="0.75" />

            {/* Precision crosshair guides */}
            <Line x1="15" y1="95" x2="35" y2="95" stroke={accentColor} strokeWidth="2" strokeOpacity="0.8" />
            <Line x1="155" y1="95" x2="175" y2="95" stroke={accentColor} strokeWidth="2" strokeOpacity="0.8" />
            <Line x1="95" y1="15" x2="95" y2="35" stroke={accentColor} strokeWidth="2" strokeOpacity="0.8" />
            <Line x1="95" y1="155" x2="95" y2="175" stroke={accentColor} strokeWidth="2" strokeOpacity="0.8" />

            {/* Aperture iris blades */}
            <Path
              d="M 95 62 L 122 80 L 115 110 L 80 118 L 68 88 Z"
              stroke={ringStroke}
              strokeWidth="1.5"
              fill="url(#lensCoreGrad)"
            />

            {/* Center focal iris */}
            <Circle cx="95" cy="95" r="16" fill="url(#coreRadialGrad)" />
            <Circle cx="95" cy="95" r="6" fill="#FFFFFF" fillOpacity="0.9" />
          </G>
        );

      case 'SIGNAL':
        return (
          <G>
            {/* Radial frequency wave arcs */}
            <Path
              d="M 40 50 A 75 75 0 0 1 150 50"
              stroke={ringStroke}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 55 68 A 55 55 0 0 1 135 68"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeOpacity="0.8"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 70 86 A 35 35 0 0 1 120 86"
              stroke={primaryColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* Emitting central beacon */}
            <Circle cx="95" cy="115" r="22" fill="url(#lensCoreGrad)" stroke={ringStroke} strokeWidth="1.5" />
            <Circle cx="95" cy="115" r="12" fill="url(#coreRadialGrad)" />
            <Circle cx="95" cy="115" r="4.5" fill="#FFFFFF" />

            {/* Telemetry vertical ray */}
            <Line x1="95" y1="137" x2="95" y2="162" stroke={ringStroke} strokeWidth="2" strokeDasharray="3 3" />
            <Circle cx="95" cy="164" r="3" fill={accentColor} />
          </G>
        );

      case 'GRID':
        return (
          <G>
            {/* Perspective matrix isometric grid */}
            <Path
              d="M 95 30 L 160 68 L 95 106 L 30 68 Z"
              stroke={accentColor}
              strokeWidth="1.8"
              fill="url(#lensCoreGrad)"
            />
            <Path
              d="M 95 68 L 160 106 L 95 144 L 30 106 Z"
              stroke={ringStroke}
              strokeWidth="1.5"
              fill="none"
            />
            <Path
              d="M 95 106 L 160 144 L 95 180 L 30 144 Z"
              stroke={ringSoft}
              strokeWidth="1"
              fill="none"
            />

            {/* Connecting nodal columns */}
            <Line x1="95" y1="30" x2="95" y2="180" stroke={ringStroke} strokeWidth="1.2" strokeDasharray="2 2" />
            <Line x1="30" y1="68" x2="30" y2="144" stroke={ringSoft} strokeWidth="1" />
            <Line x1="160" y1="68" x2="160" y2="144" stroke={ringSoft} strokeWidth="1" />

            {/* Floating focal node */}
            <Circle cx="95" cy="68" r="14" fill="url(#coreRadialGrad)" />
            <Circle cx="95" cy="68" r="5" fill="#FFFFFF" />
            <Circle cx="160" cy="68" r="4" fill={accentColor} />
            <Circle cx="30" cy="68" r="4" fill={accentColor} />
          </G>
        );

      case 'PULSE':
        return (
          <G>
            {/* Outer harmonic halo */}
            <Circle cx="95" cy="95" r="76" stroke={ringSoft} strokeWidth="1" strokeDasharray="4 4" />
            <Circle cx="95" cy="95" r="56" stroke={ringStroke} strokeWidth="1.5" />

            {/* Dynamic frequency sine / pulse wave */}
            <Path
              d="M 28 95 L 60 95 L 75 60 L 95 130 L 115 72 L 130 95 L 162 95"
              stroke={accentColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Energy nodes on wave crest and trough */}
            <Circle cx="75" cy="60" r="5" fill={primaryColor} />
            <Circle cx="95" cy="130" r="5.5" fill="url(#coreRadialGrad)" />
            <Circle cx="115" cy="72" r="4.5" fill={primaryColor} />
            <Circle cx="95" cy="95" r="9" fill={coreGlow} />
          </G>
        );

      case 'NEXUS':
        return (
          <G>
            {/* Polyhedral nodal constellation */}
            <Line x1="95" y1="38" x2="152" y2="70" stroke={ringStroke} strokeWidth="1.5" />
            <Line x1="152" y1="70" x2="152" y2="132" stroke={ringStroke} strokeWidth="1.5" />
            <Line x1="152" y1="132" x2="95" y2="164" stroke={ringStroke} strokeWidth="1.5" />
            <Line x1="95" y1="164" x2="38" y2="132" stroke={ringStroke} strokeWidth="1.5" />
            <Line x1="38" y1="132" x2="38" y2="70" stroke={ringStroke} strokeWidth="1.5" />
            <Line x1="38" y1="70" x2="95" y2="38" stroke={ringStroke} strokeWidth="1.5" />

            {/* Internal diagonal connectors */}
            <Line x1="95" y1="38" x2="95" y2="95" stroke={accentColor} strokeWidth="1.5" />
            <Line x1="38" y1="70" x2="95" y2="95" stroke={accentColor} strokeWidth="1.5" />
            <Line x1="152" y1="70" x2="95" y2="95" stroke={accentColor} strokeWidth="1.5" />
            <Line x1="38" y1="132" x2="95" y2="95" stroke={ringStroke} strokeWidth="1.2" />
            <Line x1="152" y1="132" x2="95" y2="95" stroke={ringStroke} strokeWidth="1.2" />
            <Line x1="95" y1="164" x2="95" y2="95" stroke={ringStroke} strokeWidth="1.2" />

            {/* Outer nodes */}
            <Circle cx="95" cy="38" r="5.5" fill={accentColor} />
            <Circle cx="152" cy="70" r="5.5" fill={primaryColor} />
            <Circle cx="152" cy="132" r="5" fill={primaryColor} />
            <Circle cx="95" cy="164" r="5" fill={accentColor} />
            <Circle cx="38" cy="132" r="5" fill={primaryColor} />
            <Circle cx="38" cy="70" r="5.5" fill={primaryColor} />

            {/* Central hub nexus */}
            <Circle cx="95" cy="95" r="18" fill="url(#lensCoreGrad)" stroke={accentColor} strokeWidth="2" />
            <Circle cx="95" cy="95" r="9" fill="url(#coreRadialGrad)" />
            <Circle cx="95" cy="95" r="3.5" fill="#FFFFFF" />
          </G>
        );

      case 'ORBIT':
      default:
        return (
          <G>
            {/* Concentric orbital planetary paths */}
            <Ellipse
              cx="95"
              cy="95"
              rx="78"
              ry="32"
              stroke={ringStroke}
              strokeWidth="1.5"
              fill="none"
              transform="rotate(-28 95 95)"
            />
            <Ellipse
              cx="95"
              cy="95"
              rx="78"
              ry="32"
              stroke={ringSoft}
              strokeWidth="1.2"
              fill="none"
              transform="rotate(38 95 95)"
            />

            {/* Satellites on orbit */}
            <Circle cx="34" cy="72" r="5" fill={accentColor} />
            <Circle cx="155" cy="120" r="6" fill={primaryColor} />
            <Circle cx="140" cy="62" r="4" fill={accentColor} />

            {/* Central Core sphere with soft depth */}
            <Circle cx="95" cy="95" r="34" fill="url(#lensCoreGrad)" stroke={ringStroke} strokeWidth="1.5" />
            <Circle cx="95" cy="95" r="22" fill="url(#coreRadialGrad)" />
            <Circle cx="90" cy="88" r="7" fill="#FFFFFF" fillOpacity="0.8" />
          </G>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background Soft Depth Pill/Card */}
      <View
        style={[
          styles.ambientBackdrop,
          {
            backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.7)',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            shadowColor: isDark ? '#000' : '#475569',
          },
        ]}
      />

      <Animated.View style={[StyleSheet.absoluteFill, animatedHeroStyle]}>
        <Svg width={size} height={size} viewBox="0 0 190 190">
          <Defs>
            <RadialGradient id="coreRadialGrad" cx="40%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#93C5FD" stopOpacity="1" />
              <Stop offset="45%" stopColor={primaryColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={accentColor} stopOpacity="0.9" />
            </RadialGradient>
            <LinearGradient id="lensCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={isDark ? 'rgba(59,130,246,0.22)' : 'rgba(219,234,254,0.75)'} />
              <Stop offset="100%" stopColor={isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.85)'} />
            </LinearGradient>
          </Defs>

          {renderArchetypeSvg()}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  ambientBackdrop: {
    position: 'absolute',
    width: '88%',
    height: '88%',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
});

export default React.memo(GatewayHero);
