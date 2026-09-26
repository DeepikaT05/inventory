import { useCallback, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, type Arrival, type Dealer } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Avatar, Btn, Chip, Empty, Field, Kicker, NameSheet, Pill, RoundBtn, Screen, Sheet, Txt } from '../../src/ui';
import { clock, initials, relDay, rs, toPaise, wt } from '../../src/format';
import { C, F, R } from '../../src/theme';

interface Row { packets: number; each: number; cost: string }

export default function Arrivals() {
  const { dash, refresh, say, lang, t, itemName } = useStore();
  const run = useAction();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [history, setHistory] = useState<Arrival[]>([]);
  const [open, setOpen] = useState(false);
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [slipNo, setSlipNo] = useState('');
  const [rows, setRows] = useState<Record<string, { packets: number; each: number; cost: string }>>({});
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => run(async () => {
    const [ds, hs] = await Promise.all([api.dealers(), api.arrivals()]);
    setDealers(ds); setHistory(hs);
  }), [run]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = dash?.items ?? [];
  const setRow = (id: string, patch: Partial<{ packets: number; each: number; cost: string }>) => {
    setRows((r) => ({ ...r, [id]: { ...(r[id] ?? { packets: 0, each: 10000, cost: '' }), ...patch } }));
  };

  const openSheet = () => {
    const initial: typeof rows = {};
    items.forEach((it) => { initial[it.id] = { packets: 0, each: it.packetGrams || 10000, cost: it.costRatePaise ? String(it.costRatePaise / 100) : '' }; });
    setRows(initial); setSlipNo(''); setDealerId(dealers[0]?.id ?? null); setOpen(true);
  };

  const save = () => run(async () => {
    if (!dealerId) { say(t('Pick a dealer', 'व्यापारी चुनें')); return; }
    const lines = Object.entries(rows).map(([itemId, r]) => ({
      itemId, packets: r.packets, gramsEach: r.each, costRatePaise: toPaise(r.cost) ?? 0,
    })).filter((l) => l.packets > 0);
    if (!lines.length) { say(t('Add packets for at least one item', 'कम से कम एक सामान का पैकेट लिखें')); return; }
    await api.createArrival({ dealerId, slipNo: slipNo.trim(), lines });
    setOpen(false); await Promise.all([load(), refresh()]);
    say(t('Stock added', 'स्टॉक जुड़ गया'));
  });

  const addDealer = () => run(async () => {
    const d = await api.createDealer(newName.trim());
    setDealers((ds) => [...ds, d].sort((a, b) => a.name.localeCompare(b.name)));
    setDealerId(d.id); setAdding(false); setNewName('');
  });

  const byDay = new Map<string, Arrival[]>();
  history.forEach((a) => {
    const key = relDay(new Date(a.receivedAt));
    byDay.set(key, (byDay.get(key) ?? []).concat([a]));
  });
  const days = Array.from(byDay.entries()).map(([label, lots]) => ({ label, lots }));

  const dealerName = dealers.find((d) => d.id === dealerId)?.name;

  const sheet = (
    <Sheet visible={open} onClose={() => setOpen(false)}>
      <Txt heading size={20} style={{ marginBottom: 12 }}>{t('New arrival', 'नया माल (आवक)')}</Txt>
      <Kicker en="Dealer" hi="व्यापारी" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
        {dealers.map((d) => <Chip key={d.id} label={d.name} on={dealerId === d.id} onPress={() => setDealerId(d.id)} />)}
        <Chip label={t('+ New dealer', '+ नया व्यापारी')} onPress={() => setAdding(true)} />
      </View>
      <Field label={t('Slip no. (optional)', 'पर्ची नंबर (ऐच्छिक)')} value={slipNo} onChangeText={setSlipNo} placeholder="e.g. JT-2210" />
      <View style={{ gap: 9 }}>
        {items.map((it) => {
          const r = rows[it.id];
          if (!r) return null;
          return (
            <View key={it.id} style={{ backgroundColor: C.n100, borderWidth: 1, borderColor: C.divider, borderRadius: R.md, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Pill color={it.color} w={8} h={20} />
                <Txt size={14} weight={700} hi={lang === 'hi' && Boolean(it.nameHi)}>{itemName(it)}</Txt>
                <Txt size={12} color={C.n700} style={{ marginLeft: 'auto' }}>{r.packets ? wt(r.packets * r.each) : '—'}</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RoundBtn size={30} label="−" onPress={() => setRow(it.id, { packets: Math.max(0, r.packets - 1) })} />
                  <View style={{ minWidth: 56, alignItems: 'center' }}>
                    <Txt heading size={16} style={{ lineHeight: 18 }}>{r.packets}</Txt>
                    <Txt size={9.5} color={C.n700}>{t('packets', 'पैकेट')}</Txt>
                  </View>
                  <RoundBtn size={30} label="+" onPress={() => setRow(it.id, { packets: r.packets + 1 })} />
                </View>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt size={11} color={C.n700}>{t('each', 'प्रति')}</Txt>
                  <RoundBtn size={30} label="−" onPress={() => setRow(it.id, { each: Math.max(500, r.each - 1000) })} />
                  <Txt heading size={15} style={{ minWidth: 54, textAlign: 'center' }}>{wt(r.each)}</Txt>
                  <RoundBtn size={30} label="+" onPress={() => setRow(it.id, { each: r.each + 1000 })} />
                </View>
              </View>
              {r.packets > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }}>
                  <Txt size={11} color={C.n700}>{t('Bought at ₹', 'खरीद भाव ₹')}</Txt>
                  <TextInput
                    value={r.cost}
                    onChangeText={(v) => setRow(it.id, { cost: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={C.n500}
                    style={{ minWidth: 70, height: 32, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider, fontFamily: F.body, fontSize: 14, color: C.text }}
                  />
                  <Txt size={11} color={C.n700}>{t('/kg (from slip)', '/किलो (पर्ची से)')}</Txt>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Btn block size={16} onPress={save} label={dealerName ? t(`Save under ${dealerName}`, `${dealerName} के नाम दर्ज करें`) : t('Pick a dealer', 'व्यापारी चुनें')} disabled={!dealerId} style={{ paddingVertical: 14, marginTop: 13 }} />
    </Sheet>
  );

  return (
    <Screen en="Arrivals by dealer" hi="व्यापारी आवक" overlay={<>{sheet}<NameSheet visible={adding} title={t('New dealer', 'नया व्यापारी')} value={newName} setValue={setNewName} onClose={() => setAdding(false)} onSubmit={addDealer} /></>}>
      <Btn block size={16} onPress={openSheet} disabled={!items.length} label={t('+ New arrival', '+ नया माल आया')} style={{ paddingVertical: 14, marginTop: 0, marginBottom: 14 }} />
      {days.length === 0 && <Empty en="No stock received in the last 7 days." hi="पिछले 7 दिनों में कोई माल नहीं आया।" />}
      {days.map((d) => (
        <View key={d.label} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Txt heading size={14}>{d.label}</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: C.divider }} />
            <Txt size={11} color={C.n700}>₹{rs(d.lots.reduce((a, l) => a + l.costPaise, 0))} {t('bought', 'खरीद')}</Txt>
          </View>
          {d.lots.map((c) => (
            <View key={c.id} style={{ backgroundColor: C.surface, borderRadius: R.md, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Avatar text={initials(c.dealer.name)} bg={C.g300} fg={C.g800} size={30} />
                <View style={{ flexShrink: 1 }}>
                  <Txt size={14} weight={700}>{c.dealer.name}</Txt>
                  <Txt size={11} color={C.n700}>{c.slipNo ? `Slip #${c.slipNo}` : 'No slip no.'} · {clock(new Date(c.receivedAt))}</Txt>
                </View>
                <Txt heading size={15} style={{ marginLeft: 'auto' }}>₹{rs(c.costPaise)}</Txt>
              </View>
              <View style={{ marginTop: 9, gap: 5 }}>
                {c.lines.map((r) => (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 7, height: 7, borderRadius: R.pill, backgroundColor: r.item.color }} />
                    <Txt size={12.5} weight={600}>{r.item.nameEn}</Txt>
                    <Txt size={12.5} color={C.n700}>{r.packets} packets × {wt(r.gramsEach)}</Txt>
                    <Txt size={12.5} weight={600} style={{ marginLeft: 'auto' }}>{wt(r.totalGrams)}</Txt>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}
