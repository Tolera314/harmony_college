export interface FOSettingsData {
  academicYear: string;
  currentSemester: string;
  tuitionFeePerCredit: number;
  registrationFee: number;
  lateFeePercentage: number;
  gracePeriodDays: number;
  currency: string;
  telebirrMerchantId: string;
  chapaPublicKey: string;
  bankAccountDetails: string;
  autoReconciliationEnabled: boolean;
  overdueAlertThresholdDays: number;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

let settingsStore: FOSettingsData = {
  academicYear: '2026/2027',
  currentSemester: 'Fall 2026',
  tuitionFeePerCredit: 1250,
  registrationFee: 1500,
  lateFeePercentage: 5,
  gracePeriodDays: 15,
  currency: 'ETB',
  telebirrMerchantId: 'MERCHANT-HC-9021',
  chapaPublicKey: 'CHAPUBK_TEST-xxxxxx',
  bankAccountDetails: 'CBE Account: 1000188992001 (Harmony College)',
  autoReconciliationEnabled: true,
  overdueAlertThresholdDays: 30,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
};

export async function getSettings() {
  return { settings: settingsStore };
}

export async function updateSettings(data: Partial<FOSettingsData>) {
  settingsStore = { ...settingsStore, ...data };
  return { settings: settingsStore };
}
