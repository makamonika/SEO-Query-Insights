/**
 * Gets the daily import cutoff time for today
 * @param hour - Hour in 24-hour format (default: 11)
 * @param minute - Minute (default: 0)
 * @returns Date object representing today's import cutoff time
 */
export function getDailyImportCutoff(hour: number, minute: number): Date {
  const today = new Date();
  today.setHours(hour, minute, 0, 0);
  return today;
}

/**
 * Checks if the last import meets the daily import requirement
 * Import is considered up-to-date if it was performed after the daily cutoff time (11:00 AM by default)
 * @param lastImportAt - ISO timestamp of the last import
 * @param dailyImportHour - Hour of daily import cutoff (default: 11)
 * @param dailyImportMinute - Minute of daily import cutoff (default: 0)
 * @returns true if import was performed after today's cutoff time, false otherwise
 */
export function isImportUpToDate(dailyImportHour: number, dailyImportMinute: number, lastImportAt?: string): boolean {
  if (!lastImportAt) {
    return false;
  }

  const importDate = new Date(lastImportAt);
  const cutoffTime = getDailyImportCutoff(dailyImportHour, dailyImportMinute);
  const now = new Date();

  // If cutoff time hasn't passed yet today, check if import was done after yesterday's cutoff
  if (now < cutoffTime) {
    const yesterdayCutoff = new Date(cutoffTime);
    yesterdayCutoff.setDate(yesterdayCutoff.getDate() - 1);
    return importDate >= yesterdayCutoff;
  }

  // If cutoff time has passed today, check if import was done after today's cutoff
  return importDate >= cutoffTime;
}

/**
 * Checks if import button should be visible
 * Button shows when data needs to be imported (hasn't been imported after today's cutoff)
 * @param lastImportAt - ISO timestamp of the last import
 * @param dailyImportHour - Hour of daily import cutoff (default: 11)
 * @param dailyImportMinute - Minute of daily import cutoff (default: 0)
 * @returns true if button should be shown (data not up-to-date)
 */
export function shouldShowImportButton(
  dailyImportHour: number,
  dailyImportMinute: number,
  lastImportAt?: string
): boolean {
  return !isImportUpToDate(dailyImportHour, dailyImportMinute, lastImportAt);
}
