import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/auth-context';

type Grade = {
  id: string;
  value: number;
  maxValue: number;
  term: string;
  studentId: string;
};

export default function GradesScreen() {
  const { fetchGrades } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    void fetchGrades().then((items) => setGrades(items as Grade[]));
  }, [fetchGrades]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Notes</Text>
      <FlatList
        data={grades}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8 }}>
            <Text>
              {item.value}/{item.maxValue} ({item.term})
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
