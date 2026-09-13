import React from 'react';
import { View } from 'react-native';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import PopupHistoryScreen from '../../src/features/popups/screens/PopupHistoryScreen';

export default function AccountsUpdatesRoute() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AdminHeader title="Updates" showBackButton />
      <PopupHistoryScreen embedded />
    </View>
  );
}
