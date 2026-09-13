import React from 'react';
import StaffHeader from '../../src/components/StaffHeader';
import ScreenLayout from '../../src/components/ScreenLayout';
import ViewAsBanner from '../../src/components/ViewAsBanner';
import { useEffectiveStaffId } from '../../src/hooks/useEffectiveStaffId';
import SchoolStoriesManager from '../../src/features/school-stories/SchoolStoriesManager';

export default function StaffSchoolStoriesScreen() {
  const { isViewingAsAdmin, viewAsName } = useEffectiveStaffId();
  return (
    <ScreenLayout>
      <StaffHeader showBackButton title="School Stories" />
      {isViewingAsAdmin && <ViewAsBanner name={viewAsName} />}
      <SchoolStoriesManager scopeAll={false} />
    </ScreenLayout>
  );
}
