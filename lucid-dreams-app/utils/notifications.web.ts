// Web mock for notifications - Native notifications are only supported on iOS & Android

export async function requestEMAPermissions(): Promise<boolean> {
  return false;
}

export async function scheduleEMANotifications(): Promise<void> {
  // No-op on web
  return;
}
