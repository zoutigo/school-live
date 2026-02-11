import { useEffect } from "react";
import { SafeAreaView, Text } from "react-native";
import { useAuth } from "../../src/auth/auth-context";

export default function DashboardScreen() {
  const { user, schoolSlug, fetchMe } = useAuth();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Dashboard</Text>
      <Text>School slug: {schoolSlug ?? "-"}</Text>
      <Text>
        Utilisateur:{" "}
        {user
          ? `${user.firstName} ${user.lastName} (${user.role})`
          : "non charge"}
      </Text>
    </SafeAreaView>
  );
}
