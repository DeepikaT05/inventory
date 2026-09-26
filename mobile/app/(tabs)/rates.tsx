import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useStore } from '../../src/store';
import { Card, Empty, Pill, RoundBtn, Screen, Txt } from '../../src/ui';
import { rs } from '../../src/format';
import { C } from '../../src/theme';

// Each −/+ moves the selling rate by ₹1; saves are debounced per item.
export default function Rates() {
  const { dash, refresh, say, t, itemName } = useStore();
  const items = dash?.items ?? [];
  const [rates, setRates] = useState<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { setRates(Object.fromEntries(items.map((i) => [i.id, i.sellRatePaise]))); }, [dash]); // eslint-disable-line react-hooks/exhaustive-deps

  const bump = (id: string, delta: number) => {
    const next = Math.max(100, (rates[id] ?? 0) + delta);
    setRates((r) => ({ ...r, [id]: next }));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      api.setRate(id, next).catch((e: Error) => say(e.message));
    }, 500);
  };

  return (
    <Screen en="Rates" hi="भाव">
      <Txt size={12.5} color={C.n700} style={{ marginBottom: 12 }}>
        {t('Selling rate per kg. Purchase rate comes from the dealer slip.', 'प्रति किलो बिक्री भाव। खरीद भाव आढ़ती पर्ची से तय होता है।')}
      </Txt>
      {items.length === 0 && <Empty en="No items yet." hi="कोई सामान नहीं है" />}
      <View style={{ gap: 10 }}>
        {items.map((it) => {
          const rate = rates[it.id] ?? it.sellRatePaise;
          const margin = it.costRatePaise
            ? `${t('margin', 'मार्जिन')} ${Math.round(((rate - it.costRatePaise) / it.costRatePaise) * 100)}%`
            : t('no purchase rate yet', 'अभी खरीद भाव नहीं है');
          return (
            <Card key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <Pill color={it.color} h={34} />
              <View style={{ flexShrink: 1 }}>
                <Txt size={14.5} weight={700}>{itemName(it)}</Txt>
                <Txt size={11} color={C.n700}>{it.costRatePaise ? `${t('Bought at', 'खरीद')} ₹${rs(it.costRatePaise)}/kg · ` : ''}{margin}</Txt>
              </View>
              <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <RoundBtn label="−" onPress={() => bump(it.id, -100)} />
                <Txt heading size={20} style={{ minWidth: 50, textAlign: 'center' }}>₹{rs(rate)}</Txt>
                <RoundBtn label="+" primary onPress={() => bump(it.id, 100)} />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
