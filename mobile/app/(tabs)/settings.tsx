import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type BillLanguage, type Dealer, type Shop } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Btn, Card, Chip, Field, Kicker, NameSheet, Screen, Toggle, Txt } from '../../src/ui';
import { initials } from '../../src/format';
import { C } from '../../src/theme';

const LANGS: [BillLanguage, string][] = [['ENGLISH', 'English'], ['HINDI', 'हिंदी'], ['BOTH', 'Both']];

export default function Settings() {
  const { shop, setShop, say } = useStore();
  const run = useAction();
  const [form, setForm] = useState({ name: '', ownerName: '', address: '', phone: '', gstNote: '', lowKg: '' });
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (shop) setForm({ name: shop.name, ownerName: shop.ownerName, address: shop.address, phone: shop.phone, gstNote: shop.gstNote, lowKg: String(shop.lowStockGrams / 1000) });
  }, [shop]);
  useFocusEffect(useCallback(() => { run(() => api.dealers().then(setDealers)); }, [run]));

  if (!shop) return null;

  const patch = (data: Partial<Shop>) => run(async () => setShop(await api.saveShop(data)));
  const saveProfile = () => run(async () => {
    const low = Number(form.lowKg);
    setShop(await api.saveShop({
      name: form.name.trim(), ownerName: form.ownerName.trim(), address: form.address.trim(),
      phone: form.phone.trim(), gstNote: form.gstNote.trim(),
      ...(Number.isFinite(low) && low >= 0 ? { lowStockGrams: Math.round(low * 1000) } : {}),
    }));
    say('Saved');
  });
  const addDealer = () => run(async () => {
    const d = await api.createDealer(newName.trim());
    setDealers((ds) => [...ds, d].sort((a, b) => a.name.localeCompare(b.name)));
    setAdding(false); setNewName('');
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggles: [keyof Shop, string, string][] = [
    ['printerEnabled', 'Print bills', 'Uses the phone’s print dialog / connected printer'],
    ['whatsappEnabled', 'Send bill on WhatsApp', 'Share the bill as a message'],
    ['lowStockAlert', 'Low stock alert', `Warn below ${shop.lowStockGrams / 1000} kg`],
  ];

  return (
    <Screen en="Settings" hi="सेटिंग" overlay={<NameSheet visible={adding} title="New dealer" value={newName} setValue={setNewName} onClose={() => setAdding(false)} onSubmit={addDealer} />}>
      <View style={{ gap: 10 }}>
        <Card style={{ paddingHorizontal: 14 }}>
          <Kicker en="Shop" />
          <Field label="Shop name" value={form.name} onChangeText={set('name')} />
          <Field label="Your name" value={form.ownerName} onChangeText={set('ownerName')} />
          <Field label="Address" value={form.address} onChangeText={set('address')} />
          <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Field label="GST note" value={form.gstNote} onChangeText={set('gstNote')} placeholder="e.g. GST not registered" />
          <Field label="Low stock below (kg)" value={form.lowKg} onChangeText={set('lowKg')} keyboardType="decimal-pad" />
          <Btn label="Save" onPress={saveProfile} disabled={!form.name.trim()} style={{ alignSelf: 'flex-start' }} />
        </Card>

        <Card style={{ paddingHorizontal: 14 }}>
          <Kicker en="Bill language" />
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {LANGS.map(([k, label]) => <Chip key={k} label={label} on={shop.billLanguage === k} onPress={() => patch({ billLanguage: k })} style={{ flex: 1, paddingVertical: 9 }} />)}
          </View>
        </Card>

        {toggles.map(([k, label, sub]) => (
          <Card key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
            <View style={{ flexShrink: 1 }}>
              <Txt size={14} weight={600}>{label}</Txt>
              <Txt size={11.5} color={C.n700}>{sub}</Txt>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <Toggle on={Boolean(shop[k])} onPress={() => patch({ [k]: !shop[k] })} />
            </View>
          </Card>
        ))}

        <Card style={{ paddingHorizontal: 14 }}>
          <Kicker en="Items" />
          <Txt size={12} color={C.n700} style={{ marginBottom: 6 }}>Names, colours, rates and packet sizes.</Txt>
          <Btn variant="secondary" label="Manage items" onPress={() => router.navigate('/items')} style={{ alignSelf: 'flex-start' }} />
        </Card>

        <Card style={{ paddingHorizontal: 14 }}>
          <Kicker en="Dealers" />
          {dealers.length === 0 ? <Txt size={12} color={C.n700}>No dealers yet.</Txt> : null}
          {dealers.map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: C.g300, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={11} weight={700} color={C.g800}>{initials(d.name)}</Txt>
              </View>
              <Txt size={13.5} weight={600}>{d.name}</Txt>
            </View>
          ))}
          <Btn variant="ghost" label="+ Add dealer" onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
        </Card>
      </View>
    </Screen>
  );
}
