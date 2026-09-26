import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/api';
import { useAction, useStore } from '../src/store';
import { Btn, Field, Txt } from '../src/ui';
import { C, R } from '../src/theme';

// First launch: the database is empty, so the shop profile is created here.
export default function Setup() {
  const insets = useSafeAreaInsets();
  const { refresh } = useStore();
  const run = useAction();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const save = () => run(async () => {
    await api.saveShop({ name: name.trim(), ownerName: ownerName.trim(), address: address.trim(), phone: phone.trim() });
    await refresh();
    router.replace('/items');
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 22, paddingTop: insets.top + 40 }} keyboardShouldPersistTaps="handled">
      <Txt heading size={32} style={{ lineHeight: 36 }}>Mandi Ledger</Txt>
      <Txt hi size={13} color={C.n700}>दुकान का हिसाब</Txt>
      <Txt size={13} color={C.n700} style={{ marginTop: 10, marginBottom: 22 }}>
        Sales, stock and billing for your sabzi shop. Start with your shop's details — next you'll add the items you sell.
      </Txt>
      <View>
        <Field label="Shop name" value={name} onChangeText={setName} placeholder="e.g. Verma Sabzi Bhandar" />
        <Field label="Your name" value={ownerName} onChangeText={setOwnerName} placeholder="Shown as “Namaste, … ji”" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="Printed on bills" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Printed on bills" />
      </View>
      <Btn block label="Continue" size={16} disabled={!name.trim()} onPress={save} style={{ paddingVertical: 14, borderRadius: R.pill, marginTop: 14 }} />
    </ScrollView>
  );
}
