import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type WeekReport } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Card, Chip, Screen, SectionTitle, Txt } from '../../src/ui';
import { rs, weekday, wt } from '../../src/format';
import { C, R } from '../../src/theme';

const compact = (paise: number) => {
  const r = paise / 100;
  return r >= 1000 ? (r / 1000).toFixed(1) + 'k' : String(Math.round(r));
};

export default function Report() {
  const run = useAction();
  const { t, itemName } = useStore();
  const [week, setWeek] = useState<WeekReport | null>(null);
  useFocusEffect(useCallback(() => { run(() => api.week().then(setWeek)); }, [run]));

  const max = Math.max(1, ...(week?.days.map((d) => d.totalPaise) ?? [1]));

  return (
    <Screen en="Reports" hi="रिपोर्ट">
      <View style={{ flexDirection: 'row', gap: 7, marginBottom: 12 }}>
        <Chip label={t('Rates', 'भाव')} onPress={() => router.navigate('/rates')} />
        <Chip label={t('Items', 'सामान')} onPress={() => router.navigate('/items')} />
        <Chip label={t('Settings', 'सेटिंग्स')} onPress={() => router.navigate('/settings')} />
      </View>
      {!week ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} /> : (
        <>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Card tone="surface" style={{ flex: 1, paddingHorizontal: 14 }}>
              <Txt size={11} color={C.n700}>{t('This week sale', 'इस हफ़्ते की बिक्री')}</Txt>
              <Txt heading size={24}>₹{rs(week.totalPaise)}</Txt>
            </Card>
            <Card tone="surface" style={{ flex: 1, paddingHorizontal: 14 }}>
              <Txt size={11} color={C.n700}>{t('Profit', 'मुनाफ़ा')}</Txt>
              <Txt heading size={24} color={C.g700}>₹{rs(week.profitPaise)}</Txt>
            </Card>
          </View>

          <Card style={{ marginTop: 16, padding: 14 }}>
            <Txt heading size={15} style={{ marginBottom: 12 }}>{t('Last 7 days', 'पिछले 7 दिन')}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 130 }}>
              {week.days.map((d, i) => (
                <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                  <Txt size={9.5} color={C.n700}>{compact(d.totalPaise)}</Txt>
                  <View style={{
                    width: '100%', height: `${Math.max(2, Math.round((d.totalPaise / max) * 70))}%`,
                    borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
                    backgroundColor: i === week.days.length - 1 ? C.accent : C.g400,
                  }} />
                  <Txt size={10.5} color={C.n700}>{weekday(new Date(d.date + 'T12:00:00'))}</Txt>
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle en="Sold this week" hi="हफ़्ते की बिक्री" />
          <View style={{ gap: 8 }}>
            {week.items.map((it) => (
              <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 8, height: 20, borderRadius: R.pill, backgroundColor: it.color }} />
                <Txt size={13} weight={600}>{itemName(it)}</Txt>
                <Txt size={11.5} color={C.n700}>{wt(it.grams)}</Txt>
                <Txt heading size={15} style={{ marginLeft: 'auto' }}>₹{rs(it.amountPaise)}</Txt>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
