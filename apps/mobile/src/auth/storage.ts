import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'school_live_access_token';
const SCHOOL_SLUG_KEY = 'school_live_school_slug';

export async function saveAccessToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearAccessToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveSchoolSlug(schoolSlug: string) {
  await SecureStore.setItemAsync(SCHOOL_SLUG_KEY, schoolSlug);
}

export async function getSchoolSlug() {
  return SecureStore.getItemAsync(SCHOOL_SLUG_KEY);
}

export async function clearSchoolSlug() {
  await SecureStore.deleteItemAsync(SCHOOL_SLUG_KEY);
}
