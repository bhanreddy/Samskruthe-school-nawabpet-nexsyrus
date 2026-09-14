import React from 'react';
import type { MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { MaterialTopTabs } from '../../src/layouts/MaterialTopTabs';
import StaffFooter from '../../src/components/StaffFooter';
import { useRequireRole } from '../../src/hooks/useRequireRole';
export { ErrorBoundary } from '@/src/components/ErrorBoundary';

/** Tab options plus parent native-stack fields React Navigation merges upward (e.g. headerShown). */
type StaffTabScreenOptions = MaterialTopTabNavigationOptions & {
    headerShown?: boolean;
};

const dashboardScreenOptions: StaffTabScreenOptions = {
    title: 'Home',
    headerShown: false,
};

export default function StaffLayout() {
    useRequireRole('staff', 'teacher', 'admin');

    /** Common options for screens that should NOT appear in the bottom bar. */
    const hiddenScreenOptions: StaffTabScreenOptions = {
        swipeEnabled: false,
        lazy: true,
        // These screens render their own StaffHeader, so the tab navigator must
        // not draw its default header (it showed the raw route name, e.g. "profile").
        headerShown: false,
    };

    return (
        <MaterialTopTabs
            tabBarPosition="bottom"
            tabBar={(props) => <StaffFooter {...props} />}
            screenOptions={{
                swipeEnabled: false,
                animationEnabled: true,
                lazy: true,
            }}
        >
            {/* ── Bottom-bar tabs ── */}
            <MaterialTopTabs.Screen
                name="dashboard"
                options={dashboardScreenOptions}
            />
            <MaterialTopTabs.Screen
                name="manage-students"
                options={{ title: "Attendance", headerShown: false } as any}
            />
            <MaterialTopTabs.Screen
                name="timetable"
                options={{ title: "Timetable", headerShown: false } as any}
            />
            <MaterialTopTabs.Screen
                name="results"
                options={{ title: "Results", headerShown: false } as any}
            />

            {/* ── Non-tab screens (navigable but NOT swipeable) ── */}
            <MaterialTopTabs.Screen name="attendance" options={{ ...hiddenScreenOptions, title: 'Attendance', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="complaints" options={{ ...hiddenScreenOptions, headerShown: false } as any} />
            <MaterialTopTabs.Screen name="messages" options={{ ...hiddenScreenOptions, headerShown: false } as any} />
            <MaterialTopTabs.Screen name="diary" options={{ ...hiddenScreenOptions, headerShown: false } as any} />
            <MaterialTopTabs.Screen name="events" options={{ ...hiddenScreenOptions, title: 'Events', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="academic-today" options={{ ...hiddenScreenOptions, title: 'Academic Today', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="leaves" options={{ ...hiddenScreenOptions, headerShown: false } as any} />
            <MaterialTopTabs.Screen name="lms-upload" options={hiddenScreenOptions} />
            <MaterialTopTabs.Screen name="notices" options={{ ...hiddenScreenOptions, headerShown: false } as any} />
            <MaterialTopTabs.Screen name="updates" options={{ ...hiddenScreenOptions, headerShown: false } as any} />
            <MaterialTopTabs.Screen name="school-stories" options={{ ...hiddenScreenOptions, title: 'School Stories', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="payslip" options={hiddenScreenOptions} />
            <MaterialTopTabs.Screen name="profile" options={hiddenScreenOptions} />
            <MaterialTopTabs.Screen name="settings" options={hiddenScreenOptions} />
            <MaterialTopTabs.Screen name="student-details" options={hiddenScreenOptions} />
            <MaterialTopTabs.Screen name="fine-request" options={{ ...hiddenScreenOptions, title: 'Fine request', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="student-portfolio" options={hiddenScreenOptions} />
            <MaterialTopTabs.Screen name="roll-numbers" options={{ ...hiddenScreenOptions, title: 'Roll Numbers' } as any} />
            <MaterialTopTabs.Screen name="progress-card-assistant" options={{ ...hiddenScreenOptions, title: 'Progress Cards' } as any} />
            <MaterialTopTabs.Screen name="anecdotes" options={{ ...hiddenScreenOptions, title: 'Anecdotes', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="student-intelligence" options={{ ...hiddenScreenOptions, title: 'Student Intelligence', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="admissions" options={{ ...hiddenScreenOptions, title: 'Admissions', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="admission-detail" options={{ ...hiddenScreenOptions, title: 'Application', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="omr-scanner" options={{ ...hiddenScreenOptions, title: 'OMR Scanner', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="omr-review" options={{ ...hiddenScreenOptions, title: 'OMR Review', headerShown: false } as any} />
            <MaterialTopTabs.Screen name="omr-answer-key" options={{ ...hiddenScreenOptions, title: 'OMR Answer Key', headerShown: false } as any} />
        </MaterialTopTabs>
    );
}
