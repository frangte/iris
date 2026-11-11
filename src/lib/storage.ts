import * as SecureStore from 'expo-secure-store';

/** Small key/value store for the session token and preferences. Keychain on iOS, Keystore on Android. */
export const storage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
