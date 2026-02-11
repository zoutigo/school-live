import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, Text, TextInput } from "react-native";
import { useAuth } from "../../src/auth/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const { schoolSlug, signInWithCredentials } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);

    try {
      await signInWithCredentials({ email, password });
      router.replace("/(tabs)");
    } catch {
      setError("Identifiants invalides");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Connexion</Text>
      <Text>Ecole: {schoolSlug ?? "non definie"}</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholder="email"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 8,
          padding: 10,
        }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="mot de passe"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 8,
          padding: 10,
        }}
      />
      {error ? <Text style={{ color: "crimson" }}>{error}</Text> : null}
      <Pressable
        onPress={() => void onSubmit()}
        style={{
          backgroundColor: "#0f172a",
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>Se connecter</Text>
      </Pressable>
      <Link href="/(auth)/school-select">Changer d'ecole</Link>
    </SafeAreaView>
  );
}
