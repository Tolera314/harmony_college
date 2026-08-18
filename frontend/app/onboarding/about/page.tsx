'use client';

import React, { Suspense } from 'react';
import { AboutOnboardingInner } from '@/src/components/onboarding/AboutOnboardingInner';

export default function AboutOnboardingPage() {
  return (
    <Suspense>
      <AboutOnboardingInner />
    </Suspense>
  );
}
