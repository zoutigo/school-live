import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/school-select" options={{ title: 'Selection ecole' }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Connexion' }} />
      </Stack>
    </AuthProvider>
  );
}
