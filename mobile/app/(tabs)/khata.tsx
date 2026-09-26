import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, type Customer } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Avatar, Btn, Card, Empty, NameSheet, Screen, Txt } from '../../src/ui';
import { initials, rs, shortDate } from '../../src/format';
import { C, R } from '../../src/theme';

export default function Khata() {
  const { say, lang, t } = useStore();
  const run = useAction();
  const [list, setList] = useState<Customer[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => run(async () => { setList(await api.customers()); }), [run]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const settle = (c: Customer) => run(async () => {
    await api.settle(c.id, c.balancePaise);
    say(t(`Cleared ₹${rs(c.balancePaise)} for ${c.name}`, `${c.name} का ₹${rs(c.balancePaise)} चुकता किया`));
    await load();
  });

  const add = () => run(async () => {
    await api.createCustomer(newName.trim());
    setAdding(false); setNewName('');
    await load();
  });

  const total = list.reduce((a, c) => a + c.balancePaise, 0);
  const owing = list.filter((c) => c.balancePaise > 0).length;

  return (
    <Screen en="Khata" hi="उधार बही" overlay={<NameSheet visible={adding} title={t('New khata', 'नया खाता')} value={newName} setValue={setNewName} onClose={() => setAdding(false)} onSubmit={add} />}>
      <View style={{ backgroundColor: C.g700, borderRadius: R.lg, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 14 }}>
        <Txt hi={lang === 'hi'} size={11} color={C.white} style={{ letterSpacing: lang === 'hi' ? 0.3 : 1.1, textTransform: lang === 'hi' ? 'none' : 'uppercase', opacity: 0.85 }}>
          {lang === 'hi' ? 'कुल बकाया रकम' : 'Outstanding'}
        </Txt>
        <Txt heading size={34} color={C.white} style={{ lineHeight: 40 }}>₹{rs(total)}</Txt>
        <Txt size={12} color={C.white} style={{ opacity: 0.85 }}>{t(`across ${owing} customer${owing === 1 ? '' : 's'}`, `${owing} ग्राहकों पर बाकी`)}</Txt>
      </View>
      {list.length === 0 && <Empty en="No khata customers yet. Udhaar bills appear here." hi="कोई उधार नहीं है।" />}
      <View style={{ gap: 9 }}>
        {list.map((c) => (
          <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 }}>
            <Avatar text={initials(c.name)} />
            <View style={{ flexShrink: 1 }}>
              <Txt size={14} weight={600}>{c.name}</Txt>
              <Txt size={11} color={C.n700}>
                {c.billCount} {t(`bill${c.billCount === 1 ? '' : 's'}`, 'बिल')}{c.lastBillAt ? ` · ${shortDate(new Date(c.lastBillAt))}` : ''}
              </Txt>
            </View>
            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              <Txt heading size={17} color={c.balancePaise > 500000 ? C.a700 : C.text}>₹{rs(c.balancePaise)}</Txt>
              {c.balancePaise > 0 ? <Btn variant="ghost" size={11} label={t('Mark paid', 'जमा किया')} onPress={() => settle(c)} style={{ paddingVertical: 2 }} /> : <Txt size={11} color={C.g700}>{t('Settled', 'चुकता')}</Txt>}
            </View>
          </Card>
        ))}
      </View>
      <Btn block variant="secondary" label={t('+ Add customer', '+ नया ग्राहक')} onPress={() => setAdding(true)} style={{ paddingVertical: 13, marginTop: 12 }} />
    </Screen>
  );
}
