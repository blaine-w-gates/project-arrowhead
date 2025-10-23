/**
 * Session Cleanup Utilities
 * Handles cleanup of stale journey sessions and orphaned data
 */

import { logger } from './logger';
import type { IStorage } from '../storage';

/**
 * Configuration for session cleanup
 */
export interface CleanupConfig {
  // Age in days after which incomplete sessions are considered stale
  staleSessionDays: number;
  // Age in days after which completed sessions can be archived
  archiveSessionDays: number;
  // Maximum number of sessions to process in one cleanup run
  batchSize: number;
  // Whether to actually delete or just log what would be deleted
  dryRun: boolean;
}

const DEFAULT_CONFIG: CleanupConfig = {
  staleSessionDays: 30,
  archiveSessionDays: 180,
  batchSize: 100,
  dryRun: false
};

/**
 * Cleanup result statistics
 */
export interface CleanupResult {
  staleSessions: number;
  archivedSessions: number;
  orphanedTasks: number;
  errors: number;
  duration: number;
}

/**
 * Cleanup stale and old journey sessions
 */
export async function cleanupSessions(
  storage: IStorage,
  config: Partial<CleanupConfig> = {}
): Promise<CleanupResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  logger.info('Starting session cleanup', {
    config: finalConfig,
    timestamp: new Date().toISOString()
  });

  const result: CleanupResult = {
    staleSessions: 0,
    archivedSessions: 0,
    orphanedTasks: 0,
    errors: 0,
    duration: 0
  };

  try {
    // Calculate cutoff dates
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - finalConfig.staleSessionDays * 24 * 60 * 60 * 1000);
    const archiveCutoff = new Date(now.getTime() - finalConfig.archiveSessionDays * 24 * 60 * 60 * 1000);

    logger.debug('Cleanup cutoff dates', {
      staleCutoff: staleCutoff.toISOString(),
      archiveCutoff: archiveCutoff.toISOString()
    });

    // Note: In-memory storage doesn't have efficient queries for this
    // This is a placeholder for when proper database storage is implemented
    // For now, we'll document the intended behavior

    logger.info('Session cleanup completed', {
      result,
      config: finalConfig
    });

  } catch (error) {
    logger.error('Session cleanup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config: finalConfig
    });
    result.errors++;
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Schedule automatic cleanup
 * Returns a cleanup function to stop the scheduler
 */
export function scheduleCleanup(
  storage: IStorage,
  config: Partial<CleanupConfig> = {},
  intervalHours: number = 24
): () => void {
  logger.info('Scheduling automatic session cleanup', {
    intervalHours,
    config
  });

  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  // Run immediately on start
  cleanupSessions(storage, config).catch(error => {
    logger.error('Initial cleanup failed', { error });
  });

  // Schedule recurring cleanup
  const intervalId = setInterval(() => {
    cleanupSessions(storage, config).catch(error => {
      logger.error('Scheduled cleanup failed', { error });
    });
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    logger.info('Session cleanup scheduler stopped');
  };
}

/**
 * Cleanup orphaned tasks (tasks without a valid session)
 * This is a maintenance operation for data consistency
 */
export async function cleanupOrphanedTasks(
  storage: IStorage,
  dryRun: boolean = false
): Promise<number> {
  logger.info('Starting orphaned task cleanup', { dryRun });

  // Note: Implementation depends on storage layer
  // Placeholder for future implementation
  
  return 0;
}

/**
 * Get cleanup statistics without performing cleanup
 */
export async function getCleanupStats(
  storage: IStorage,
  config: Partial<CleanupConfig> = {}
): Promise<{
  staleSessions: number;
  oldCompletedSessions: number;
  orphanedTasks: number;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate cutoff dates
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - finalConfig.staleSessionDays * 24 * 60 * 60 * 1000);
  const archiveCutoff = new Date(now.getTime() - finalConfig.archiveSessionDays * 24 * 60 * 60 * 1000);

  // Note: Actual implementation depends on storage layer
  // This is a placeholder showing the intended interface

  return {
    staleSessions: 0,
    oldCompletedSessions: 0,
    orphanedTasks: 0
  };
}
