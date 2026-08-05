'use client';

import React, { Suspense } from 'react';
import { OnboardingWizard } from '@/src/components/onboarding/OnboardingWizard';

/**
 * /onboarding — Profile Completion Wizard
 * Accepts optional ?step=N to deep-link to a specific wizard step.
 * Only accessible after account creation + contact verification.
 */
export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
