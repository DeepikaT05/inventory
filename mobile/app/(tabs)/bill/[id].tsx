import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import { api, type Bill, type Shop } from '../../../src/api';
import { useAction, useStore } from '../../../src/store';
import { Btn, Screen, Txt } from '../../../src/ui';
import { clock, longDate, rs, wt } from '../../../src/format';
import { C, R, shadow } from '../../../src/theme';

const PAY_LABEL_EN = { CASH: 'Paid in cash', UPI: 'Paid by UPI', CREDIT: 'On khata' } as const;
const PAY_LABEL_HI = { CASH: 'नकद भुगतान', UPI: 'यूपीआई भुगतान', CREDIT: 'खाते पर' } as const;

function billItemName(b: Bill['lines'][number], lang: 'en' | 'hi') {
  if (lang === 'hi' && b.item.nameHi) return b.item.nameHi;
  return b.item.nameEn;
}

function billText(b: Bill, shop: Shop, lang: 'en' | 'hi') {
  const d = new Date(b.createdAt);
  const payLabel = lang === 'hi' ? PAY_LABEL_HI[b.paymentMode] : PAY_LABEL_EN[b.paymentMode];
  return [
    `*${shop.name}*`,
    [shop.address, shop.phone].filter(Boolean).join(' · '),
    `Bill #${b.number} · ${clock(d)}, ${longDate(d)}`,
    '',
    ...b.lines.map((l) => `${billItemName(l, lang)}  ${wt(l.grams)} @ ₹${rs(l.ratePaise)}  = ₹${rs(l.amountPaise)}`),
    '',
    `*Total ₹${rs(b.totalPaise)}*`,
    `${payLabel} · ${b.customer?.name ?? (lang === 'hi' ? 'ग्राहक' : 'Walk-in')}`,
  ].filter((x, i) => i !== 1 || x).join('\n');
}

function billHtml(b: Bill, shop: Shop, lang: 'en' | 'hi') {
  const d = new Date(b.createdAt);
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const rows = b.lines.map((l) => `<tr><td>${esc(billItemName(l, lang))}<br><small>${wt(l.grams)} @ ₹${rs(l.ratePaise)}</small></td><td class="r">₹${rs(l.amountPaise)}</td></tr>`).join('');
  const payLabel = lang === 'hi' ? PAY_LABEL_HI[b.paymentMode] : PAY_LABEL_EN[b.paymentMode];
  return `<html><head><meta name="viewport" content="width=device-width"><style>
    body{font-family:sans-serif;width:280px;margin:0 auto;color:#201e1d}
    h1{font-size:18px;text-align:center;margin:8px 0 2px} .c{text-align:center;font-size:11px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px} td{padding:4px 0;border-top:1px solid #ddd}
    .r{text-align:right} .t{font-size:18px;font-weight:bold;border-top:2px solid #201e1d}
  </style></head><body>
    <h1>${esc(shop.name)}</h1><div class="c">${esc([shop.address, shop.phone].filter(Boolean).join(' · '))}</div>
    <div class="c">Bill #${b.number} · ${clock(d)}, ${longDate(d)}</div>
    <table>${rows}<tr><td class="t">${lang === 'hi' ? 'कुल' : 'Total'}</td><td class="t r">₹${rs(b.totalPaise)}</td></tr></table>
    <div class="c" style="margin-top:6px">${payLabel} · ${esc(b.customer?.name ?? (lang === 'hi' ? 'ग्राहक' : 'Walk-in'))}</div>
  </body></html>`;
}

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop, lang, t } = useStore();
  const run = useAction();
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => { setBill(null); run(() => api.bill(id).then(setBill)); }, [id, run]);

  const share = () => run(async () => {
    if (!bill || !shop) return;
    const text = billText(bill, shop, lang);
    const phone = bill.customer?.phone?.replace(/\D/g, '');
    const url = `whatsapp://send?text=${encodeURIComponent(text)}${phone ? `&phone=91${phone.slice(-10)}` : ''}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else await Share.share({ message: text });
  });

  const print = () => run(async () => {
    if (bill && shop) await Print.printAsync({ html: billHtml(bill, shop, lang) });
  });

  if (!bill || !shop) return <Screen en="Bill ready" hi="बिल तैयार"><ActivityIndicator color={C.accent} style={{ marginTop: 40 }} /></Screen>;
  const d = new Date(bill.createdAt);
  const payLabel = lang === 'hi' ? PAY_LABEL_HI[bill.paymentMode] : PAY_LABEL_EN[bill.paymentMode];

  return (
    <Screen en="Bill ready" hi="बिल तैयार">
      <View style={[{ backgroundColor: C.white, borderRadius: R.md, paddingVertical: 20, paddingHorizontal: 18 }, shadow.md]}>
        <View style={{ alignItems: 'center', borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: C.n400, paddingBottom: 12 }}>
          <Txt heading size={21}>{shop.name}</Txt>
          {shop.address || shop.phone ? <Txt size={11} color={C.n700}>{[shop.address, shop.phone].filter(Boolean).join(' · ')}</Txt> : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
          <Txt size={11.5} color={C.n700}>{lang === 'hi' ? `बिल #${bill.number}` : `Bill #${bill.number}`}</Txt>
          <Txt size={11.5} color={C.n700}>{clock(d)}, {longDate(d)}</Txt>
        </View>
        {bill.lines.map((l) => (
          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.divider }}>
            <Txt size={13.5} weight={600}>{billItemName(l, lang)}</Txt>
            <Txt size={11.5} color={C.n700}>{wt(l.grams)} @ ₹{rs(l.ratePaise)}</Txt>
            <Txt size={14} style={{ marginLeft: 'auto' }}>₹{rs(l.amountPaise)}</Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 2, borderTopColor: C.text, marginTop: 8, paddingTop: 10 }}>
          <Txt heading size={15}>{lang === 'hi' ? 'कुल' : 'Total'}</Txt>
          <Txt heading size={26} style={{ marginLeft: 'auto' }}>₹{rs(bill.totalPaise)}</Txt>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Txt size={12} color={C.n700}>{payLabel}</Txt>
          <Txt size={12} color={C.n700}>{bill.customer?.name ?? (lang === 'hi' ? 'ग्राहक' : 'Walk-in')}</Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
        {shop.whatsappEnabled && <Btn variant="sage" label={t('Share on WhatsApp', 'व्हाट्सएप पर भेजें')} onPress={share} style={{ flex: 1, paddingVertical: 13 }} />}
        {shop.printerEnabled && <Btn variant="secondary" label={t('Print', 'प्रिंट करें')} onPress={print} style={{ flex: 1, paddingVertical: 13 }} />}
      </View>
      <Btn block size={16} onPress={() => router.navigate('/sale')} style={{ paddingVertical: 14 }}>
        <Txt heading size={16} color={C.bg}>{t('Next sale', 'अगली बिक्री')}</Txt>
      </Btn>
    </Screen>
  );
}

