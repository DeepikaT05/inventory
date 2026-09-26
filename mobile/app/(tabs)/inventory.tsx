import { useCallback } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/store';
import { Btn, Card, Empty, Pill, Screen, Txt } from '../../src/ui';
import { relDay, wt } from '../../src/format';
import { C, R } from '../../src/theme';

export default function Inventory() {
  const { dash, refresh, lang, t, itemName } = useStore();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const items = dash?.items ?? [];

  return (
    <Screen en="Inventory" hi="स्टॉक">
      {items.length === 0 && <Empty en="No items yet." hi="कोई सामान नहीं है।" action={t('Add items', 'सामान जोड़ें')} onAction={() => router.navigate('/items')} />}
      <View style={{ gap: 9 }}>
        {items.map((it) => {
          const packets = it.packetGrams ? Math.round(it.stockGrams / it.packetGrams) : 0;
          const bar = Math.min(100, Math.round((it.stockGrams / Math.max(1, it.capacityGrams)) * 100));
          const last = it.lastArrival
            ? (lang === 'hi' ? `${relDay(new Date(it.lastArrival.at))} आया · ${it.lastArrival.dealer.split(' ')[0]}` : `In ${relDay(new Date(it.lastArrival.at))} · ${it.lastArrival.dealer.split(' ')[0]}`)
            : (lang === 'hi' ? 'कोई आवक नहीं' : 'No arrivals yet');
          return (
            <Card key={it.id} style={{ paddingHorizontal: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pill color={it.color} h={30} />
                <View>
                  <Txt size={15} weight={700} hi={lang === 'hi' && Boolean(it.nameHi)}>{itemName(it)}</Txt>
                </View>
                <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                  <Txt heading size={20}>{wt(it.stockGrams)}</Txt>
                  <Txt size={11} color={C.n700}>≈ {packets} {t('packets', 'पैकेट')}</Txt>
                </View>
              </View>
              <View style={{ height: 6, borderRadius: R.pill, backgroundColor: C.n300, marginTop: 10, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${bar}%`, borderRadius: R.pill, backgroundColor: it.color }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Txt size={11} color={C.n700}>{t(`Sold today ${wt(it.soldTodayGrams)}`, `आज बिका ${wt(it.soldTodayGrams)}`)}</Txt>
                <Txt size={11} color={C.n700}>{last}</Txt>
              </View>
            </Card>
          );
        })}
      </View>
      <Btn block variant="secondary" label={t('See dealer consignments', 'व्यापारी माल (आवक) देखें')} onPress={() => router.navigate('/arrivals')} style={{ paddingVertical: 13, marginTop: 12 }} />
    </Screen>
  );
}
