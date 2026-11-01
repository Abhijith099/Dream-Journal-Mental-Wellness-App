import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let Notifications: any = null;
let Device: any = null;

// In Expo Go on Android (SDK 53+), remote push notifications were removed.
// We detect if running in Expo Go or web and safely no-op/bypass.
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    if (Notifications?.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (err) {
    console.warn('Native notification modules not available:', err);
  }
}

export async function requestEMAPermissions(): Promise<boolean> {
  // Early return for Expo Go and Web to prevent SDK 53 push notification crash
  if (Platform.OS === 'web' || isExpoGo || !Notifications || !Device) return false;
  if (!Device.isDevice) {
    console.log('EMA Notifications: Running on simulator/emulator, physical device required for native notifications');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.error('Error requesting notification permissions:', err);
    return false;
  }
}

export async function scheduleEMANotifications(): Promise<void> {
  // Early return for Expo Go and Web
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return;

  try {
    // Clear previously scheduled notifications to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 3 Daily check-in prompts: morning (9:00), early afternoon (13:30), evening (19:00)
    const prompts = [
      {
        hour: 9,
        minute: 0,
        title: 'Lucid Dreams • Morning Check-in',
        body: 'Quick check-in: how is your inner weather right now?',
      },
      {
        hour: 13,
        minute: 30,
        title: 'Lucid Dreams • Midday Pulse',
        body: 'One second: tap your current energy level.',
      },
      {
        hour: 19,
        minute: 0,
        title: 'Lucid Dreams • Evening Reflection',
        body: 'Evening check-in — how has your day felt?',
      },
    ];

    for (const prompt of prompts) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: prompt.title,
          body: prompt.body,
          data: { type: 'ema_checkin' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: prompt.hour,
          minute: prompt.minute,
          repeats: true,
        },
      });
    }

    console.log('Successfully scheduled 3 daily EMA notifications');
  } catch (err) {
    console.error('Error scheduling EMA notifications:', err);
  }
}
