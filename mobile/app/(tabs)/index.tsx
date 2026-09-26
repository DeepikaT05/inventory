import { useCallback } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/store';
import { Avatar, Btn, Empty, Pill, Screen, SectionTitle, Txt } from '../../src/ui';
import { initials, rs, wt } from '../../src/format';
import { C, R, shadow } from '../../src/theme';

export default function Home() {
  const { dash, shop, refresh, setCart, say, lang, t, itemName } = useStore();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const greetingEn = shop?.ownerName ? `Namaste, ${shop.ownerName} ji` : 'Namaste';
  const greetingHi = shop?.ownerName ? `नमस्ते, ${shop.ownerName} जी` : 'नमस्ते';

  if (!dash) return <Screen en={greetingEn} hi={greetingHi}><ActivityIndicator color={C.accent} style={{ marginTop: 40 }} /></Screen>;
  const tStats = dash.today;

  const money = (label: string, paise: number) => (
    <View>
      <Txt size={12.5} color={C.a100} style={{ opacity: 0.75 }}>{label}</Txt>
      <Txt size={12.5} weight={700} color={C.white}>₹{rs(paise)}</Txt>
    </View>
  );

  return (
    <Screen en={greetingEn} hi={greetingHi}>
      <View style={[{ backgroundColor: C.a700, borderRadius: R.lg, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }, shadow.md]}>
        <Txt hi={lang === 'hi'} size={11} color={C.a100} style={{ letterSpacing: lang === 'hi' ? 0.4 : 1.1, textTransform: lang === 'hi' ? 'none' : 'uppercase', opacity: 0.85 }}>
          {lang === 'hi' ? 'आज की कुल बिक्री' : "Today's sale"}
        </Txt>
        <Txt heading size={40} color={C.white} style={{ lineHeight: 46, marginTop: 4 }}>₹{rs(tStats.totalPaise)}</Txt>
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
          {money(lang === 'hi' ? 'नकद' : 'Cash', tStats.cashPaise)}
          {money('UPI', tStats.upiPaise)}
          {money(lang === 'hi' ? 'उधार' : 'Udhaar', tStats.creditPaise)}
          <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
            <Txt size={12.5} color={C.a100} style={{ opacity: 0.75 }}>{lang === 'hi' ? 'बिल' : 'Bills'}</Txt>
            <Txt size={12.5} weight={700} color={C.white}>{tStats.bills}</Txt>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <BigAction en="New sale" hi="नई बिक्री" bg={C.accent} pressed={C.a600} onPress={() => router.navigate('/sale')} />
        <BigAction en="Stock in" hi="माल आया" bg={C.g600} pressed={C.g700} onPress={() => router.navigate('/arrivals')} />
      </View>

      <SectionTitle en="Today's rate" hi="आज का भाव" right={<Btn variant="ghost" size={12} label={t('Change', 'बदलें')} onPress={() => router.navigate('/rates')} />} />
      {dash.items.length === 0 ? (
        <Empty en="No items yet. Add onion, potato and the rest to start billing." hi="सामान जोड़ें और बिक्री शुरू करें" action={t('Add items', 'सामान जोड़ें')} onAction={() => router.navigate('/items')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {dash.items.map((it) => (
            <View key={it.id} style={{ width: '48.7%', backgroundColor: C.surface, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pill color={it.color} />
              <View style={{ flexShrink: 1 }}>
                <Txt hi={lang === 'hi' && Boolean(it.nameHi)} size={13.5} weight={600} numberOfLines={1}>{itemName(it)}</Txt>
              </View>
              <Txt heading size={16} style={{ marginLeft: 'auto' }}>₹{rs(it.sellRatePaise)}</Txt>
            </View>
          ))}
        </View>
      )}

      {dash.recentCustomers.length > 0 && (
        <>
          <SectionTitle en="Recent regular" hi="हाल के नियमित ग्राहक" />
          <View style={{ gap: 8 }}>
            {dash.recentCustomers.map((r) => (
              <Pressable
                key={r.customerId}
                onPress={() => {
                  setCart(r.lines.map((l) => ({ itemId: l.itemId, grams: l.grams })));
                  say(t(`Loaded ${r.name}'s items`, `${r.name} का सामान लोड किया`));
                  router.navigate('/sale');
                }}
                style={({ pressed: p }) => [{
                  backgroundColor: C.n100, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.divider,
                  opacity: p ? 0.7 : 1,
                }]}
              >
                <Avatar text={initials(r.name)} size={32} />
                <View style={{ flexShrink: 1 }}>
                  <Txt size={13.5} weight={600}>{r.name}</Txt>
                  <Txt size={11} color={C.n700} numberOfLines={1}>{r.lines.map((l) => `${l.nameEn} ${wt(l.grams)}`).join(' · ')}</Txt>
                </View>
                <Txt heading size={12} color={C.a700} style={{ marginLeft: 'auto' }}>{t('Repeat', 'दोहराएं')}</Txt>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {dash.lowStock && (
        <View style={{ marginTop: 20, backgroundColor: C.a200, borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexShrink: 1 }}>
            <Txt size={12.5} color={C.a900}>
              <Txt size={12.5} weight={700} color={C.a900}>{itemName(dash.lowStock)}</Txt> {t(`stock is low — ${wt(dash.lowStock.stockGrams)} left.`, `का स्टॉक कम है — ${wt(dash.lowStock.stockGrams)} बचा है।`)}
            </Txt>
          </View>
          <Btn label={t('Order', 'मंगाएं')} size={12} onPress={() => router.navigate('/arrivals')} style={{ marginLeft: 'auto', paddingVertical: 7, paddingHorizontal: 14 }} />
        </View>
      )}
    </Screen>
  );
}

function BigAction({ en, hi, bg, pressed, onPress }: { en: string; hi: string; bg: string; pressed: string; onPress: () => void }) {
  const { lang } = useStore();
  const text = lang === 'hi' && hi ? hi : en;
  const isHi = lang === 'hi' && Boolean(hi);
  return (
    <Pressable onPress={onPress} style={({ pressed: p }) => ({ flex: 1, backgroundColor: p ? pressed : bg, borderRadius: R.md, paddingVertical: 16, paddingHorizontal: 14, justifyContent: 'center' })}>
      <Txt heading={!isHi} hi={isHi} size={16} weight={isHi ? 700 : undefined} color={C.white}>{text}</Txt>
    </Pressable>
  );
}
