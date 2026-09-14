import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { GatewayAction } from '../types';
import { useTheme } from '../../../hooks/useTheme';
import { GatewayEasings } from '../motion/gatewayMotion';

interface GatewayActionsProps {
  actions: GatewayAction[];
  onExecuteAction: (action: GatewayAction) => Promise<void> | void;
  isRequested?: boolean;
  isSubscribed?: boolean;
}

export const GatewayActions: React.FC<GatewayActionsProps> = ({
  actions = [],
  onExecuteAction,
  isRequested = false,
  isSubscribed = false,
}) => {
  const { theme, isDark } = useTheme();
  const [activeExecuting, setActiveExecuting] = useState<string | null>(null);

  if (!actions || actions.length === 0) {
    return null;
  }

  const primaryAction = actions.find((a) => a.variant === 'primary') || actions[0];
  const secondaryAction = actions.find((a) => a.variant === 'secondary') || (actions.length > 1 ? actions[1] : null);
  const tertiaryAction = actions.find((a) => a.variant === 'ghost') || (actions.length > 2 ? actions[2] : null);

  const handlePress = async (action: GatewayAction) => {
    setActiveExecuting(action.type);
    try {
      await onExecuteAction(action);
    } finally {
      setActiveExecuting(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Primary Action Button */}
      {primaryAction ? (
        <AnimatedActionButton
          action={primaryAction}
          variant="primary"
          isRequested={isRequested}
          isSubscribed={isSubscribed}
          isLoading={activeExecuting === primaryAction.type}
          onPress={() => handlePress(primaryAction)}
        />
      ) : null}

      {/* 2. Secondary Action Button */}
      {secondaryAction ? (
        <AnimatedActionButton
          action={secondaryAction}
          variant="secondary"
          isLoading={activeExecuting === secondaryAction.type}
          onPress={() => handlePress(secondaryAction)}
        />
      ) : null}

      {/* 3. Tertiary Ghost Link */}
      {tertiaryAction && tertiaryAction.type !== secondaryAction?.type ? (
        <Pressable
          style={styles.tertiaryLink}
          onPress={() => handlePress(tertiaryAction)}
          hitSlop={12}
        >
          <Text style={[styles.tertiaryText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {tertiaryAction.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

interface AnimatedActionButtonProps {
  action: GatewayAction;
  variant: 'primary' | 'secondary';
  isRequested?: boolean;
  isSubscribed?: boolean;
  isLoading?: boolean;
  onPress: () => void;
}

const AnimatedActionButton: React.FC<AnimatedActionButtonProps> = ({
  action,
  variant,
  isRequested,
  isSubscribed,
  isLoading,
  onPress,
}) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, GatewayEasings.spring);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, GatewayEasings.spring);
  };

  // Status-driven labels & disabled state
  let effectiveLabel = action.label;
  let isDisabled = false;

  if (action.type === 'ASK_ADMIN' || action.type === 'REQUEST_ACCESS') {
    if (isRequested) {
      effectiveLabel = 'Request Already Sent ✓';
      isDisabled = true;
    }
  } else if (action.type === 'NOTIFY_ME') {
    if (isSubscribed) {
      effectiveLabel = "You're On The List ✓";
      isDisabled = true;
    }
  }

  const primaryBg = theme.colors.primary || '#2563EB';
  const secondaryBg = isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.9)';
  const secondaryBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(203,213,225,0.8)';
  const primaryText = '#FFFFFF';
  const secondaryText = isDark ? '#F1F5F9' : '#1E293B';

  return (
    <Animated.View style={[styles.buttonWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled || isLoading}
        style={[
          styles.buttonBase,
          variant === 'primary'
            ? [
                styles.primaryButton,
                { backgroundColor: isDisabled ? (isDark ? '#334155' : '#94A3B8') : primaryBg },
                Platform.OS === 'web' && ({ cursor: isDisabled ? 'auto' : 'pointer' } as any),
              ]
            : [
                styles.secondaryButton,
                { backgroundColor: secondaryBg, borderColor: secondaryBorder },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ],
        ]}
        accessibilityRole="button"
        accessibilityLabel={effectiveLabel}
      >
        {isLoading ? (
          <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : primaryBg} size="small" />
        ) : (
          <Text
            style={[
              styles.buttonText,
              { color: variant === 'primary' ? primaryText : secondaryText },
            ]}
          >
            {effectiveLabel}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 10,
    maxWidth: 440,
    alignSelf: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
  buttonBase: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButton: {
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tertiaryLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tertiaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default React.memo(GatewayActions);
