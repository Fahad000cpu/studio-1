
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAnalytics } from '@/firebase';
import { logEvent } from 'firebase/analytics';

export function AnalyticsLogger() {
  const analytics = useAnalytics();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // This effect runs when the pathname or search parameters change.
    if (analytics && pathname) {
      // Using 'screen_view' is standard for Firebase to track screen transitions in single-page apps.
      logEvent(analytics, 'screen_view', {
        firebase_screen: pathname, // The path of the screen.
        firebase_screen_class: 'AppRouter' // In web, we don't have a native class name, so a general name is fine.
      });
    }
  }, [pathname, searchParams, analytics]);

  // This component is purely for logging and does not render any UI.
  return null;
}
