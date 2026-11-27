import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { getSpots, API_URL } from '../lib/api';
import type { Activity, Spot } from '../lib/types';
import { useTheme } from '../lib/theme';

export default function Home() {
  const t = useTheme();
  const [mode, setMode] = useState<Activity>('dive');
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpots()
      .then((r) => setSpots(r.data.spots))
      .catch(() => setError(`Can't reach the conditions server at ${API_URL}.`));
  }, []);

  const list = (spots ?? []).filter((s) => s.activities.includes(mode));

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.switch, { backgroundColor: t.card, borderColor: t.border }]}>
        {(['dive', 'fish'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.switchBtn, mode === m && { backgroundColor: t.accent }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
          >
            <Text style={[styles.switchText, { color: mode === m ? '#fff' : t.text }]}>{m === 'dive' ? 'Dive' : 'Fish'}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}
      {!spots && !error && <ActivityIndicator style={{ marginTop: 32 }} />}

      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/spot/[id]', params: { id: item.id, mode } }} asChild>
            <Pressable style={StyleSheet.flatten([styles.spot, { backgroundColor: t.card, borderColor: t.border }])}>
              <Text style={[styles.spotName, { color: t.text }]}>{item.name}</Text>
              <Text style={{ color: t.muted }}>{item.area}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  switch: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, marginBottom: 12 },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  switchText: { fontSize: 16, fontWeight: '700' },
  spot: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  spotName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  error: { marginVertical: 16, fontSize: 15 },
});
