import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, Text, TextInput } from 'react-native';
import { useAuth } from '../../src/auth/auth-context';

export default function SchoolSelectScreen() {
  const router = useRouter();
  const { selectSchool, schoolSlug } = useAuth();
  const [value, setValue] = useState(schoolSlug ?? 'demo');

  async function onSave() {
    await selectSchool(value);
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Choisir un etablissement</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        placeholder="school slug"
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }}
      />
      <Pressable
        onPress={() => void onSave()}
        style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 8, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff' }}>Continuer</Text>
      </Pressable>
    </SafeAreaView>
  );
}
