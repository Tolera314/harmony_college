'use client';

import React, { Suspense } from 'react';
import { ApplyPageInner } from '@/src/components/onboarding/ApplyPageInner';

/**
 * /apply — Student Onboarding Entry Point
 * Stage 1: Create Account → Stage 2: Verify Contact
 * After verification, redirects to /onboarding for profile completion.
 */
export default function ApplyPage() {
  return (
    <Suspense>
      <ApplyPageInner />
    </Suspense>
  );
}
