import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getConditions, type Loaded } from '../../lib/api';
import type { Activity, ClarityEstimate, Reading, Source, SpotConditions } from '../../lib/types';
import { useTheme, type Theme } from '../../lib/theme';
import { Card, KindTag, ReadingRow, SourceLine, StaleChip } from '../../components/Readings';
import { ageLabel, dayTimeHST, timeHST } from '../../lib/format';

export default function SpotScreen() {
  const { id, mode = 'dive' } = useLocalSearchParams<{ id: string; mode?: Activity }>();
  const t = useTheme();
  const [state, setState] = useState<Loaded<SpotConditions> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setState(await getConditions(id));
      setError(null);
    } catch {
      setError('Could not load conditions and there is no saved copy on this phone yet.');
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const c = state?.data;
  const tideCard = c && <TideCard c={c} t={t} />;
  const clarityCard = c && <ClarityCard reading={c.clarity} t={t} />;

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <Stack.Screen options={{ title: c?.spot.name ?? '' }} />
      {!c && !error && <ActivityIndicator style={{ marginTop: 40 }} />}
      {error && <Text style={[styles.banner, { color: t.danger }]}>{error}</Text>}

      {c && (
        <>
          <Text style={[styles.sub, { color: t.muted }]}>
            {c.spot.area} · {mode === 'dive' ? 'Diving' : 'Fishing'} · updated {dayTimeHST(c.generatedAt)}
          </Text>

          {state.offline && (
            <Text style={[styles.banner, { color: t.stale, backgroundColor: t.staleBg }]}>
              No connection. Showing the copy saved on this phone {ageLabel((Date.now() - Date.parse(state.savedAt)) / 3.6e6)}.
            </Text>
          )}
          {c.warnings.map((w) => (
            <Text key={w} style={[styles.banner, { color: t.stale, backgroundColor: t.staleBg }]}>
              {w}
            </Text>
          ))}

          {/* Dive: clarity is the headline. Fish: tide is the headline. */}
          {mode === 'dive' ? clarityCard : tideCard}

          <Card title="Swell">
            <ReadingRow reading={c.swell.primary} fallbackLabel="Primary swell" />
            <ReadingRow reading={c.swell.secondary} fallbackLabel="Wind swell" />
            {!c.swell.primary && <ReadingRow reading={c.swell.significant} fallbackLabel="Wave height" />}
          </Card>

          {mode === 'dive' ? tideCard : clarityCard}

          <Card title="Sun & moon">
            <Row t={t} label="Sunrise" value={timeHST(c.sunMoon.sunrise)} />
            <Row t={t} label="Sunset" value={timeHST(c.sunMoon.sunset)} />
            <Row t={t} label="Moon" value={`${c.sunMoon.moonPhase} · ${c.sunMoon.moonIllumination}%`} />
            <View style={styles.meta}>
              <KindTag kind="computed" />
            </View>
          </Card>

          <Card title="Coming soon">
            <Text style={{ color: t.muted, lineHeight: 20 }}>
              Wind (measured and forecast, with gusts), rain and stream runoff, swell forecast, and the last 7 days.
            </Text>
          </Card>

          {c.spot.notes && (
            <Card title="Local notes">
              <Text style={{ color: t.text, lineHeight: 20 }}>{c.spot.notes}</Text>
            </Card>
          )}

          <Card title="Sources on this page">
            {uniqueSources(c).map((s) => (
              <Text key={s.name} style={[styles.link, { color: t.accent }]} onPress={() => Linking.openURL(s.url)}>
                {s.name}
              </Text>
            ))}
          </Card>

          <Text style={[styles.disclaimer, { color: t.muted }]}>{c.disclaimer}</Text>
        </>
      )}
    </ScrollView>
  );
}

function ClarityCard({ reading, t }: { reading: Reading<ClarityEstimate> | null; t: Theme }) {
  if (!reading) {
    return (
      <Card title="Water clarity">
        <Text style={{ color: t.muted }}>No estimate: the swell buoy for this spot isn't reporting.</Text>
      </Card>
    );
  }
  const est = reading.value;
  return (
    <Card title="Water clarity">
      <View style={styles.heroRow}>
        <Text style={[styles.hero, { color: est ? t.estimate : t.muted }]}>{reading.display}</Text>
        {est && <Text style={{ color: t.muted }}>Confidence: {est.confidence}</Text>}
      </View>
      {est && <ScaleBar score={est.score} t={t} />}
      <View style={styles.meta}>
        <KindTag kind="estimate" />
        {reading.stale && <StaleChip hours={reading.ageHours} />}
      </View>
      {est?.reasons.map((r) => (
        <Text key={r} style={{ color: t.text, marginTop: 6 }}>
          • {r}
        </Text>
      ))}
      {reading.note && <Text style={[styles.note, { color: t.muted }]}>{reading.note}</Text>}
      <SourceLine source={reading.source} observedAt={reading.observedAt} />
    </Card>
  );
}

function ScaleBar({ score, t }: { score: number; t: Theme }) {
  return (
    <View style={styles.scale}>
      {['Murky', 'Poor', 'Fair', 'Good', 'Excellent'].map((label, i) => (
        <View key={label} style={{ flex: 1, alignItems: 'center' }}>
          <View style={[styles.scaleSeg, { backgroundColor: i < score ? t.estimate : t.border }]} />
          <Text style={{ fontSize: 10, color: i + 1 === score ? t.text : t.muted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function TideCard({ c, t }: { c: SpotConditions; t: Theme }) {
  return (
    <Card title="Tide · Kahului Harbor">
      {c.tide.next.length === 0 && <Text style={{ color: t.muted }}>Tide predictions unavailable.</Text>}
      {c.tide.next.map((e) => (
        <Row key={e.time} t={t} label={`${e.type === 'high' ? 'High' : 'Low'} · ${dayTimeHST(e.time)}`} value={`${e.heightFt.toFixed(1)} ft`} />
      ))}
      {c.tide.next.length > 0 && (
        <>
          <View style={styles.meta}>
            <KindTag kind="forecast" />
          </View>
          <SourceLine source={c.tide.source} observedAt={null} />
        </>
      )}
      <ReadingRow reading={c.tide.now} fallbackLabel="Water level now" />
      <Text style={[styles.note, { color: t.muted }]}>
        Kahului is Maui's only tide station; times at other spots can differ by up to an hour.
      </Text>
    </Card>
  );
}

function Row({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: t.text, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function uniqueSources(c: SpotConditions): Source[] {
  const all = [c.swell.primary?.source, c.swell.significant?.source, c.tide.source, c.sunMoon.source].filter(Boolean) as Source[];
  return [...new Map(all.map((s) => [s.name, s])).values()];
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  sub: { marginBottom: 12, fontSize: 13 },
  banner: { padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 14, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hero: { fontSize: 34, fontWeight: '800' },
  scale: { flexDirection: 'row', gap: 4, marginTop: 10 },
  scaleSeg: { height: 8, alignSelf: 'stretch', borderRadius: 4, marginBottom: 3 },
  meta: { flexDirection: 'row', gap: 6, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  note: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  link: { paddingVertical: 4, textDecorationLine: 'underline' },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
});
