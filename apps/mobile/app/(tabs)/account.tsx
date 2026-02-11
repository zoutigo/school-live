import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, Text } from "react-native";
import { useAuth } from "../../src/auth/auth-context";

export default function AccountScreen() {
  const router = useRouter();
  const { user, schoolSlug, logout } = useAuth();

  async function onLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Compte</Text>
      <Text>Ecole: {schoolSlug ?? "-"}</Text>
      <Text>
        {user
          ? `${user.firstName} ${user.lastName} (${user.role})`
          : "Utilisateur non charge"}
      </Text>
      <Pressable
        onPress={() => void onLogout()}
        style={{
          backgroundColor: "#b91c1c",
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>Se deconnecter</Text>
      </Pressable>
    </SafeAreaView>
  );
}
