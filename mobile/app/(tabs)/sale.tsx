import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, type Customer, type Item, type PaymentMode } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Btn, Chip, Empty, Kicker, NameSheet, Pill, Screen, Sheet, Txt } from '../../src/ui';
import { lineAmount, rs, wt } from '../../src/format';
import { C, R } from '../../src/theme';

const PAY: [PaymentMode, string, string][] = [['CASH', 'Cash', 'नकद'], ['UPI', 'UPI', 'UPI'], ['CREDIT', 'Udhaar', 'उधार']];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];
const QUICK = [500, 1000, 2000, 5000];

export default function Sale() {
  const { dash, cart, setCart, say, lang, t, itemName, refresh } = useStore();
  const run = useAction();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const [pay, setPay] = useState<PaymentMode>('CASH');
  const [who, setWho] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [weigh, setWeigh] = useState<Item | null>(null);
  const [digits, setDigits] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    refresh();
    api.customers().then(setCustomers).catch(() => {});
  }, [refresh]));

  useEffect(() => {
    if (params.customerId) { setWho(params.customerId); router.setParams({ customerId: undefined }); }
  }, [params.customerId]);

  const items = dash?.items ?? [];
  const g = parseInt(digits, 10) || 0;

  const lines = cart.map((c, idx) => {
    const it = items.find((i) => i.id === c.itemId);
    if (!it) return null;
    return { idx, it, grams: c.grams, amt: lineAmount(it.sellRatePaise, c.grams) };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const total = lines.reduce((acc, l) => acc + l.amt, 0);
  const totalG = lines.reduce((acc, l) => acc + l.grams, 0);

  const addLine = () => {
    if (!weigh || g <= 0) return;
    setCart((c) => [...c, { itemId: weigh.id, grams: g }]);
    setWeigh(null);
    setDigits('');
  };

  const finish = () => run(async () => {
    if (lines.length === 0) return;
    if (pay === 'CREDIT' && !who) { say(t('Pick a customer for udhaar', 'उधार के लिए ग्राहक चुनें')); return; }
    setSaving(true);
    try {
      const bill = await api.createBill({
        paymentMode: pay,
        customerId: who ?? null,
        lines: lines.map((l) => ({ itemId: l.it.id, grams: l.grams })),
      });
      setCart([]); setPay('CASH'); setWho(null);
      await refresh();
      router.navigate(`/bill/${bill.id}` as never);
    } finally { setSaving(false); }
  });

  const addCustomer = () => run(async () => {
    const c = await api.createCustomer(newName.trim());
    setCustomers((cs) => [...cs, { ...c, billCount: 0, lastBillAt: null }]);
    setWho(c.id);
    setAdding(false);
    setNewName('');
  });

  const sheet = (
    <Sheet visible={Boolean(weigh)} onClose={() => setWeigh(null)}>
      {weigh && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View>
              <Txt heading size={22}>{itemName(weigh)}</Txt>
              <Txt size={12} color={C.n700}>₹{rs(weigh.sellRatePaise)}/kg</Txt>
            </View>
            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              <Txt heading size={30} style={{ lineHeight: 34 }}>{g ? wt(g) : '0 g'}</Txt>
              <Txt size={12} color={C.a700}>₹{rs(lineAmount(weigh.sellRatePaise, g))}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 13, marginBottom: 11 }}>
            {QUICK.map((q) => (
              <Btn key={q} variant="secondary" label={wt(q)} size={12.5} onPress={() => setDigits(String(q))} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 0 }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KEYS.map((k) => (
              <Pressable
                key={k}
                onPress={() => setDigits((d) => (k === '⌫' ? d.slice(0, -1) : (d + k).replace(/^0+/, '').slice(0, 6)))}
                onLongPress={k === '⌫' ? () => setDigits('') : undefined}
                style={({ pressed }) => ({ width: '31.8%', height: 48, justifyContent: 'center', borderRadius: R.md, alignItems: 'center', backgroundColor: k === '⌫' ? (pressed ? C.n200 : 'transparent') : pressed ? C.n300 : C.surface })}
              >
                {k === '⌫' ? (
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <Path d="m18 9-6 6" />
                    <Path d="m12 9 6 6" />
                  </Svg>
                ) : (
                  <Txt heading size={20}>{k}</Txt>
                )}
              </Pressable>
            ))}
          </View>
          <Btn block label={t('Add to bill', 'बिल में जोड़ें')} size={16} onPress={addLine} style={{ paddingVertical: 14, marginTop: 11 }} />
          <Txt size={11} color={C.n600} style={{ textAlign: 'center', marginTop: 8 }}>{t('Weight in grams', 'वजन ग्राम में लिखें')}</Txt>
        </>
      )}
    </Sheet>
  );

  return (
    <Screen en="New sale" hi="सामान तौलें" overlay={<>{sheet}<NameSheet visible={adding} title={t('New khata', 'नया खाता')} value={newName} setValue={setNewName} onClose={() => setAdding(false)} onSubmit={addCustomer} /></>}>
      {items.length === 0 ? (
        <Empty en="Add items before your first sale." hi="बिक्री से पहले सामान जोड़ें।" action={t('Add items', 'सामान जोड़ें')} onAction={() => router.navigate('/items')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => { setWeigh(it); setDigits(''); }}
              style={({ pressed }) => ({
                width: '48.3%', minHeight: 104, backgroundColor: pressed ? C.n300 : C.surface, borderWidth: 1, borderColor: C.divider,
                borderLeftWidth: 7, borderLeftColor: it.color, borderRadius: R.md, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 13,
              })}
            >
              <Txt heading size={19}>{itemName(it)}</Txt>
              <Txt size={11.5} style={{ opacity: 0.75, marginTop: 5 }}>₹{rs(it.sellRatePaise)}/kg · {wt(it.stockGrams)} {t('left', 'बाकी')}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      {lines.length > 0 ? (
        <>
          <View style={{ marginTop: 16, backgroundColor: C.n100, borderWidth: 1, borderColor: C.divider, borderRadius: R.md, overflow: 'hidden' }}>
            {lines.map((l) => (
              <View key={l.idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: C.divider }}>
                <Pill color={l.it.color} w={8} h={22} />
                <View>
                  <Txt size={13.5} weight={600}>{itemName(l.it)}</Txt>
                  <Txt size={11} color={C.n700}>{wt(l.grams)} × ₹{rs(l.it.sellRatePaise)}/kg</Txt>
                </View>
                <Txt heading size={16} style={{ marginLeft: 'auto' }}>₹{rs(l.amt)}</Txt>
                <Pressable hitSlop={8} onPress={() => setCart((c) => c.filter((_, j) => j !== l.idx))} style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={18} color={C.n600}>×</Txt>
                </Pressable>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 13, backgroundColor: C.surface }}>
              <View>
                <Txt size={11} color={C.n700} style={{ letterSpacing: 0.9, textTransform: lang === 'hi' ? 'none' : 'uppercase' }}>{lang === 'hi' ? 'कुल वजन' : 'Total'}</Txt>
                <Txt size={11} color={C.n700}>{wt(totalG)}</Txt>
              </View>
              <Txt heading size={26} style={{ marginLeft: 'auto' }}>₹{rs(total)}</Txt>
            </View>
          </View>

          <Kicker en="Payment" hi="भुगतान" style={{ marginTop: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAY.map(([k, enLabel, hiLabel]) => (
              <Chip key={k} label={lang === 'hi' ? hiLabel : enLabel} on={pay === k} onColor={C.g600} onPress={() => setPay(k)} style={{ flex: 1, paddingVertical: 11 }} />
            ))}
          </View>

          {pay === 'CREDIT' && (
            <View style={{ marginTop: 10 }}>
              <Kicker en="Khata name" hi="खाता नाम" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {customers.map((c) => <Chip key={c.id} label={c.name} on={who === c.id} onPress={() => setWho(c.id)} />)}
                <Chip label={t('+ New', '+ नया')} onPress={() => setAdding(true)} />
              </View>
            </View>
          )}

          <Btn block size={17} disabled={saving} onPress={finish} label={t(`Save bill · ₹${rs(total)}`, `बिल बनाएं · ₹${rs(total)}`)} style={{ paddingVertical: 15, marginTop: 14 }} />
        </>
      ) : items.length > 0 ? (
        <Empty en="Tap an item to weigh it" hi="तौल के लिए सामान चुनें" />
      ) : null}
    </Screen>
  );
}
