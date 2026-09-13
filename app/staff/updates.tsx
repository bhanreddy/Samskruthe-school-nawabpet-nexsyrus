import React from 'react';
import StaffHeader from '../../src/components/StaffHeader';
import ScreenLayout from '../../src/components/ScreenLayout';
import PopupHistoryScreen from '../../src/features/popups/screens/PopupHistoryScreen';

export default function StaffUpdatesRoute() {
  return (
    <ScreenLayout>
      <StaffHeader showBackButton title="Updates" />
      <PopupHistoryScreen embedded />
    </ScreenLayout>
  );
}
