import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type Item } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Btn, Card, Empty, Field, Kicker, Pill, Screen, Sheet, Txt } from '../../src/ui';
import { rs, toGrams, toPaise, wt } from '../../src/format';
import { C, ITEM_COLORS, R } from '../../src/theme';

const blank = { nameEn: '', nameHi: '', color: ITEM_COLORS[0], rate: '', cost: '', packetKg: '10', capKg: '100', stockKg: '0' };
type Form = typeof blank;

export default function Items() {
  const { dash, refresh, say, lang, t, itemName } = useStore();
  const run = useAction();
  const items = dash?.items ?? [];
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [form, setForm] = useState<Form>(blank);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const open = (it: Item | 'new') => {
    setForm(it === 'new'
      ? { ...blank, color: ITEM_COLORS[items.length % ITEM_COLORS.length] }
      : {
        nameEn: it.nameEn, nameHi: it.nameHi, color: it.color, rate: String(it.sellRatePaise / 100),
        cost: it.costRatePaise ? String(it.costRatePaise / 100) : '', packetKg: String(it.packetGrams / 1000),
        capKg: String(it.capacityGrams / 1000), stockKg: String(it.stockGrams / 1000),
      });
    setEditing(it);
  };
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => run(async () => {
    const rate = toPaise(form.rate);
    const packet = toGrams(form.packetKg);
    const cap = toGrams(form.capKg);
    const stock = toGrams(form.stockKg);
    if (!form.nameEn.trim()) { say(t('Enter the item name', 'सामान का नाम लिखें')); return; }
    if (!rate) { say(t('Enter a selling rate', 'बिक्री भाव लिखें')); return; }
    if (!packet || !cap) { say(t('Packet and full-stock weight must be above 0', 'पैकेट और वजन 0 से अधिक होना चाहिए')); return; }
    const base = { nameEn: form.nameEn.trim(), nameHi: form.nameHi.trim(), color: form.color, costRatePaise: toPaise(form.cost) ?? 0, packetGrams: packet, capacityGrams: cap };

    if (editing === 'new') {
      await api.createItem({ ...base, sellRatePaise: rate, stockGrams: stock ?? 0, sortOrder: items.length });
    } else if (editing) {
      await api.updateItem(editing.id, base);
      if (editing.sellRatePaise !== rate) await api.setRate(editing.id, rate);
    }
    setEditing(null);
    await refresh();
    say(editing === 'new' ? t('Item added', 'सामान जोड़ा गया') : t('Item saved', 'सामान सहेजा गया'));
  });

  const remove = (it: Item) => run(async () => {
    await api.removeItem(it.id);
    setEditing(null);
    await refresh();
    say(t('Item removed', 'सामान हटाया गया'));
  });

  const sheet = (
    <Sheet visible={Boolean(editing)} onClose={() => setEditing(null)}>
      <Txt heading size={20} style={{ marginBottom: 14 }}>{editing === 'new' ? t('Add item', 'सामान जोड़ें') : t('Edit item', 'सामान बदलें')}</Txt>
      <Field label={t('Name (English)', 'नाम (अंग्रेज़ी)')} value={form.nameEn} onChangeText={set('nameEn')} placeholder="e.g. Aloo / Potato" autoFocus />
      <Field label={t('Name (Hindi)', 'नाम (हिंदी)')} value={form.nameHi} onChangeText={set('nameHi')} placeholder="उदा. आलू" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label={t('Selling rate (₹/kg)', 'बिक्री भाव (₹/किलो)')} value={form.rate} onChangeText={set('rate')} keyboardType="decimal-pad" style={{ flex: 1 }} />
        <Field label={t('Cost rate (₹/kg, optional)', 'खरीद भाव (₹/किलो, ऐच्छिक)')} value={form.cost} onChangeText={set('cost')} keyboardType="decimal-pad" style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label={t('One packet weight (kg)', 'एक पैकेट वजन (किलो)')} value={form.packetKg} onChangeText={set('packetKg')} keyboardType="decimal-pad" style={{ flex: 1 }} />
        <Field label={t('Full stock capacity (kg)', 'दुकान क्षमता (किलो)')} value={form.capKg} onChangeText={set('capKg')} keyboardType="decimal-pad" style={{ flex: 1 }} />
      </View>
      {editing === 'new' ? (
        <Field label={t('Starting stock (kg)', 'शुरुआती स्टॉक (किलो)')} value={form.stockKg} onChangeText={set('stockKg')} keyboardType="decimal-pad" />
      ) : null}
      <Kicker en="Color" hi="रंग" />
      <View style={{ flexDirection: 'row', gap: 9, marginBottom: 14 }}>
        {ITEM_COLORS.map((c) => (
          <Pressable key={c} onPress={() => setForm((f) => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: R.pill, backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: C.text }} />
        ))}
      </View>
      <Btn block label={t('Save item', 'सामान सहेजें')} size={16} onPress={save} style={{ paddingVertical: 14 }} />
      {editing && editing !== 'new' ? <Btn block variant="ghost" label={t('Remove item', 'सामान हटाएं')} onPress={() => remove(editing)} /> : null}
    </Sheet>
  );

  return (
    <Screen en="Items" hi="सामान" overlay={sheet}>
      {items.length === 0 && <Empty en="Add each item you sell — onion, potato, garlic, ginger…" hi="बेचने वाले सभी सामान जोड़ें — आलू, प्याज, लहसुन…" />}
      <View style={{ gap: 9 }}>
        {items.map((it) => (
          <Pressable key={it.id} onPress={() => open(it)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <Pill color={it.color} h={34} /> 
              <View style={{ flexShrink: 1 }}>
                <Txt size={14.5} weight={700} hi={lang === 'hi' && Boolean(it.nameHi)}>{itemName(it)}</Txt>
                <Txt size={11} color={C.n700}>{wt(it.stockGrams)} {t('in stock', 'स्टॉक में')} · {t('packet', 'पैकेट')} {wt(it.packetGrams)}</Txt>
              </View>
              <Txt heading size={18} style={{ marginLeft: 'auto' }}>₹{rs(it.sellRatePaise)}</Txt>
            </Card>
          </Pressable>
        ))}
      </View>
      <Btn block label={t('+ Add item', '+ सामान जोड़ें')} size={16} onPress={() => open('new')} style={{ paddingVertical: 14, marginTop: 12 }} />
      {items.length > 0 && <Btn block variant="secondary" label={t('Done', 'पूर्ण')} onPress={() => router.navigate('/')} style={{ paddingVertical: 13 }} />}
    </Screen>
  );
}
