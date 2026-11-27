import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Reading, ReadingKind, Source } from '../lib/types';
import { useTheme } from '../lib/theme';
import { ageLabel, dayTimeHST } from '../lib/format';

const KIND_TEXT: Record<ReadingKind, string> = {
  measured: '● Measured',
  forecast: '○ Forecast',
  estimate: 'Estimate',
  computed: 'Calculated',
};

/** Every number carries one of these, so nobody mistakes a guess for a measurement. */
export function KindTag({ kind }: { kind: ReadingKind }) {
  const t = useTheme();
  const color = kind === 'estimate' ? t.estimate : kind === 'measured' ? t.measured : t.forecast;
  return (
    <Text
      style={[
        styles.tag,
        { color, borderColor: color },
        kind === 'estimate' && { borderStyle: 'dashed', borderWidth: 1 },
      ]}
    >
      {KIND_TEXT[kind]}
    </Text>
  );
}

export function StaleChip({ hours }: { hours: number | null }) {
  const t = useTheme();
  return (
    <Text style={[styles.chip, { color: t.stale, backgroundColor: t.staleBg }]}>
      Old data · {ageLabel(hours) || 'unknown age'}
    </Text>
  );
}

export function SourceLine({ source, observedAt, ageHours }: { source: Source; observedAt: string | null; ageHours?: number | null }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => source.url && Linking.openURL(source.url)} accessibilityRole="link">
      <Text style={[styles.source, { color: t.muted }]}>
        {source.name}
        {observedAt ? ` · ${dayTimeHST(observedAt)}` : ''}
        {ageHours != null ? ` (${ageLabel(ageHours)})` : ''}
      </Text>
    </Pressable>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.cardTitle, { color: t.muted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export function ReadingRow({ reading, fallbackLabel }: { reading: Reading | null; fallbackLabel?: string }) {
  const t = useTheme();
  if (!reading) {
    return (
      <View style={styles.row}>
        <Text style={[styles.label, { color: t.text }]}>{fallbackLabel}</Text>
        <Text style={[styles.value, { color: t.muted }]}>Not available</Text>
      </View>
    );
  }
  return (
    <View style={styles.rowBlock}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: t.text }]}>{reading.label}</Text>
        <Text style={[styles.value, { color: reading.stale ? t.muted : t.text }]}>{reading.display}</Text>
      </View>
      <View style={styles.metaRow}>
        <KindTag kind={reading.kind} />
        {reading.stale && <StaleChip hours={reading.ageHours} />}
      </View>
      <SourceLine source={reading.source} observedAt={reading.observedAt} ageHours={reading.stale ? null : reading.ageHours} />
      {reading.note && <Text style={[styles.note, { color: t.muted }]}>{reading.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  source: { fontSize: 12, marginTop: 4, textDecorationLine: 'underline' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  rowBlock: { paddingVertical: 8 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  label: { fontSize: 15, flexShrink: 1 },
  value: { fontSize: 17, fontWeight: '700', textAlign: 'right' },
  note: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
});
