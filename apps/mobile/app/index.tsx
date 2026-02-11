import { Redirect } from "expo-router";
import { ActivityIndicator, SafeAreaView } from "react-native";
import { useAuth } from "../src/auth/auth-context";

export default function IndexScreen() {
  const { isBootstrapping, schoolSlug, signedIn } = useAuth();

  if (isBootstrapping) {
    return (
      <SafeAreaView
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!schoolSlug) {
    return <Redirect href="/(auth)/school-select" />;
  }

  if (!signedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
