/**
 * Jest global test setup.
 * Loads .env.test (if present) so tests can connect to a test database.
 * Falls back to DATABASE_URL from the environment if .env.test does not exist.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test first, fall back to .env
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Suppress console output during tests (uncomment if too noisy)
// global.console.log = jest.fn();
// global.console.error = jest.fn();
