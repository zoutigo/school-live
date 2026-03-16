import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth/auth-context";
import { useEffect } from "react";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Roboto_400Regular, Roboto_500Medium } from "@expo-google-fonts/roboto";
import * as SplashScreen from "expo-splash-screen";
import { View, ActivityIndicator } from "react-native";
import { colors } from "../src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.primaryDark,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/school-select" />
        <Stack.Screen name="(auth)/login" />
      </Stack>
    </AuthProvider>
  );
}
