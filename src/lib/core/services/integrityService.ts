/**
 * @file Data Integrity Service (The Immune System)
 * Responsible for validating, repairing, and monitoring the health of the application's data.
 * @module integrityService
 */

import { z } from 'zod';
import { DIRECTORY_STORAGE_KEY } from '$lib/constants';
import * as errorService from '$lib/core/services/errorService';

const SETTINGS_STORAGE_KEY = 'schemas-work-settings-v2';
const THEME_STORAGE_KEY = 'schemas-work-theme';
const QUARANTINE_STORAGE_KEY = 'schemas-work-quarantine';

// --- ZOD SCHEMAS ---

const ThemeSchema = z.enum(['light', 'dark', 'system']);

const ApiKeySchema = z.object({
  id: z.string(),
  key: z.string(),
  provider: z.string(), // simplified from union for robustness
  lastUsed: z.number(),
  nickname: z.string().optional(),
  requests: z.array(z.object({ timestamp: z.number() })),
});

const SettingsSchema = z.object({
  selectedModelId: z.string(),
  apiKeys: z.array(ApiKeySchema),
  embeddingMethod: z.enum(['cloud', 'local']),
});

const SchemaMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  type: z.enum(['schema', 'folder']),
  parentId: z.string().nullable(),
});

const DirectorySchema = z.array(SchemaMetadataSchema);

// --- TYPES ---

export interface HealthReport {
  status: 'healthy' | 'repaired' | 'critical';
  issues: string[];
  repairs: string[];
  quarantined: string[];
  storageUsage: number | null; // Percentage 0-100
}

// --- PUBLIC API ---

/**
 * Runs a full system health check.
 * Should be called on application startup.
 */
export async function initialize(): Promise<HealthReport> {
  if (typeof window === 'undefined') {
    return { status: 'healthy', issues: [], repairs: [], quarantined: [], storageUsage: 0 };
  }

  const report: HealthReport = {
    status: 'healthy',
    issues: [],
    repairs: [],
    quarantined: [],
    storageUsage: null,
  };

  console.log('[Integrity Service] Starting system scan...');

  // 1. Validate Theme
  validateItem(THEME_STORAGE_KEY, ThemeSchema, report, 'default');

  // 2. Validate Settings
  validateItem(SETTINGS_STORAGE_KEY, SettingsSchema, report, 'quarantine');

  // 3. Validate Directory
  const directoryValid = validateItem(DIRECTORY_STORAGE_KEY, DirectorySchema, report, 'quarantine');

  // 4. Check for Orphaned Y.js Databases (if directory is valid)
  if (directoryValid) {
    await checkOrphans(report);
  }

  // 5. Check Storage Quota
  await checkStorageQuota(report);

  if (report.issues.length > 0 || report.repairs.length > 0 || report.quarantined.length > 0) {
    console.warn('[Integrity Service] Scan complete with findings:', report);
    if (report.quarantined.length > 0) report.status = 'critical';
    else if (report.repairs.length > 0) report.status = 'repaired';
  } else {
    console.log('[Integrity Service] System healthy.');
  }

  return report;
}

// --- INTERNAL HELPERS ---

function validateItem(
  key: string,
  schema: z.ZodSchema,
  report: HealthReport,
  action: 'quarantine' | 'default'
): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return true; // Missing is fine (will use default)

  try {
    const data = JSON.parse(raw);
    const result = schema.safeParse(data);

    if (!result.success) {
      const issue = `Validation failed for ${key}: ${result.error.message}`;
      report.issues.push(issue);
      console.error(issue);

      if (action === 'quarantine') {
        quarantineItem(key, raw, report);
        localStorage.removeItem(key);
      } else {
        // For simple things like theme, just reset it
        localStorage.removeItem(key);
        report.repairs.push(`Reset ${key} to default.`);
      }
      return false;
    }
    return true;
  } catch (e) {
    const issue = `JSON parse error for ${key}`;
    report.issues.push(issue);
    if (action === 'quarantine') {
      quarantineItem(key, raw, report);
    }
    localStorage.removeItem(key);
    return false;
  }
}

function quarantineItem(key: string, content: string, report: HealthReport) {
  try {
    const quarantineRaw = localStorage.getItem(QUARANTINE_STORAGE_KEY);
    const quarantine = quarantineRaw ? JSON.parse(quarantineRaw) : {};
    
    quarantine[`${key}_${Date.now()}`] = content;
    
    localStorage.setItem(QUARANTINE_STORAGE_KEY, JSON.stringify(quarantine));
    report.quarantined.push(key);
    console.warn(`[Integrity Service] Quarantined corrupt item: ${key}`);
  } catch (e) {
    console.error('[Integrity Service] Failed to quarantine item:', e);
  }
}

async function checkOrphans(report: HealthReport) {
  if (!window.indexedDB) return;

  try {
    const databases = await window.indexedDB.databases();
    const directoryRaw = localStorage.getItem(DIRECTORY_STORAGE_KEY);
    const directory = directoryRaw ? JSON.parse(directoryRaw) : [];
    const validIds = new Set(directory.map((d: any) => d.id));

    for (const db of databases) {
      // Y.js databases usually use the UUID as the name
      // We check if the DB name looks like a UUID but isn't in our directory
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(db.name || '');
      
      if (isUuid && db.name && !validIds.has(db.name)) {
        console.warn(`[Integrity Service] Found orphaned database: ${db.name}`);
        // We don't auto-delete yet to be safe, just report
        // report.issues.push(`Orphaned database found: ${db.name}`);
        
        // Uncomment to enable auto-deletion:
        // window.indexedDB.deleteDatabase(db.name);
        // report.repairs.push(`Deleted orphaned database: ${db.name}`);
      }
    }
  } catch (e) {
    console.error('[Integrity Service] Error checking orphans:', e);
  }
}

async function checkStorageQuota(report: HealthReport) {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage && estimate.quota) {
        const percentage = (estimate.usage / estimate.quota) * 100;
        report.storageUsage = percentage;
        
        if (percentage > 80) {
          report.issues.push(`Storage usage is high (${percentage.toFixed(1)}%)`);
        }
      }
    } catch (e) {
      console.error('[Integrity Service] Error checking storage quota:', e);
    }
  }
}
