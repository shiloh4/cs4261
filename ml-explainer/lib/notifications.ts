import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function initNotificationsAsync() {
  // Foreground display behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [200, 100, 200],
      lightColor: '#FF231F7C',
    });
  }
}

export async function notifyAnalysisDone(model: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Analysis Ready',
      body: `Model ${model} finished analyzing your image.`,
      sound: undefined,
    },
    trigger: null, // fire immediately
  });
}

