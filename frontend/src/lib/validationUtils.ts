/**
 * Shared validation utilities for forms across the application
 */

/**
 * Validates Ethiopian phone numbers
 * Accepts two formats:
 * - 09XXXXXXXX (10 digits starting with 09)
 * - +251XXXXXXXXX (13 characters: +251 followed by 9 digits)
 */
export function validateEthiopianPhone(phone: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { valid: false, error: 'Phone number is required.' };
  }

  // Remove any spaces for validation
  const cleaned = trimmed.replace(/\s/g, '');

  if (cleaned.startsWith('09')) {
    // Format: 09XXXXXXXX (exactly 10 digits)
    if (!/^09\d{8}$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Phone must be exactly 10 digits starting with 09 (e.g., 0912345678)',
      };
    }
  } else if (cleaned.startsWith('+251')) {
    // Format: +251XXXXXXXXX (exactly 13 characters)
    if (!/^\+251\d{9}$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Phone must be +251 followed by 9 digits (e.g., +251912345678)',
      };
    }
  } else {
    return {
      valid: false,
      error: 'Phone must start with 09 or +251',
    };
  }

  return { valid: true };
}

/**
 * Formats a full name by capitalizing the first letter of each word
 * Example: "amanuel abate horeta" → "Amanuel Abate Horeta"
 */
export function formatFullName(name: string): string {
  if (!name) return '';
  
  return name
    .split(/\s+/) // Split by one or more spaces
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Validates a full name
 * - Must have at least 2 words
 * - Each word must have at least 1 character
 */
export function validateFullName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Full name is required.' };
  }

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  if (words.length < 2) {
    return {
      valid: false,
      error: 'Please enter your full name (at least first and last name).',
    };
  }

  return { valid: true };
}
