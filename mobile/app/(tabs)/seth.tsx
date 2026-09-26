import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Print from 'expo-print';
import { api, type SethConsignment, type SethConsignmentItem, type SethResponse } from '../../src/api';
import { useAction, useStore } from '../../src/store';
import { Avatar, Btn, Chip, Empty, Field, Kicker, Pill, RoundBtn, Screen, Sheet, Txt } from '../../src/ui';
import { clock, initials, longDate, relDay, rs, shortDate, toPaise, wt } from '../../src/format';
import { C, F, R } from '../../src/theme';

interface WeightItemDraft {
  id: string;
  name: string;
  color: string;
  boraCount: number;
  ratePerKgText: string;
  weights: number[]; // weights in kg
  weightInputText: string;
}

const PRESET_VEGGIES = [
  { name: 'आलू (Aaloo)', en: 'Aaloo', color: '#b2622d' },
  { name: 'प्याज (Pyaaz)', en: 'Pyaaz', color: '#9c2a1c' },
  { name: 'अदरक (Adrak)', en: 'Adrak', color: '#c67139' },
  { name: 'लहसुन (Lehsun)', en: 'Lehsun', color: '#645c50' },
];

export default function SethScreen() {
  const { shop, lang, t, say, refresh } = useStore();
  const run = useAction();

  const [data, setData] = useState<SethResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'STOCK_SOLD' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [openNew, setOpenNew] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState<SethConsignment | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openSettle, setOpenSettle] = useState(false);
  const [openPostSettle, setOpenPostSettle] = useState(false); // Post-settlement popup
  const [settleAmountText, setSettleAmountText] = useState('');
  const [settlePaymentMode, setSettlePaymentMode] = useState('CASH');

  // Form State for New Consignment
  const [formSethName, setFormSethName] = useState('');
  const [formSethPhone, setFormSethPhone] = useState('');
  const [formAdvanceAmount, setFormAdvanceAmount] = useState('');
  const [formDeductions, setFormDeductions] = useState('');
  const [formAddToStock, setFormAddToStock] = useState(true);

  // Items draft list inside New Consignment
  const [itemDrafts, setItemDrafts] = useState<WeightItemDraft[]>([]);
  const [customItemName, setCustomItemName] = useState('');

  const loadData = useCallback(() => run(async () => {
    const res = await api.seth({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      seth: searchQuery,
    });
    setData(res);
  }), [run, statusFilter, searchQuery]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Open fresh blank form
  const handleOpenNewLot = () => {
    setFormSethName('');
    setFormSethPhone('');
    setFormAdvanceAmount('');
    setFormDeductions('');
    setFormAddToStock(true);
    setCustomItemName('');
    setItemDrafts([]);
    setOpenNew(true);
  };

  // Add an item to draft
  const addItemDraft = (name: string, color = '#c67139') => {
    setItemDrafts((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}-${Math.random()}`,
        name,
        color,
        boraCount: 10,
        ratePerKgText: '',
        weights: [],
        weightInputText: '',
      },
    ]);
  };

  const removeItemDraft = (id: string) => {
    setItemDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  // Parse comma or space separated weights string into number[]
  const parseWeightsString = (text: string): number[] => {
    return text
      .split(/[\s,]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  };

  const updateItemWeights = (id: string, text: string) => {
    const parsed = parseWeightsString(text);
    setItemDrafts((prev) =>
      prev.map((it) => (it.id === id ? { ...it, weightInputText: text, weights: parsed } : it))
    );
  };

  // Add quick preset weight to an item
  const addQuickWeight = (id: string, weightKg: number) => {
    setItemDrafts((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const newWeights = [...it.weights, weightKg];
        return {
          ...it,
          weights: newWeights,
          weightInputText: newWeights.join(', '),
        };
      })
    );
  };

  const clearWeights = (id: string) => {
    setItemDrafts((prev) =>
      prev.map((it) => (it.id === id ? { ...it, weights: [], weightInputText: '' } : it))
    );
  };

  // Calculate live item total weight & amount
  const getItemStats = (item: WeightItemDraft) => {
    let totalKg = 0;
    if (item.weights.length > 0) {
      totalKg = item.weights.reduce((a, b) => a + b, 0);
    } else {
      totalKg = item.boraCount * 50;
    }
    const rateKg = parseFloat(item.ratePerKgText) || 0;
    const totalAmount = Math.round(totalKg * rateKg);
    return { totalKg, rateKg, totalAmount };
  };

  // Consignment Draft Totals
  const draftCalculation = useMemo(() => {
    let grossAmount = 0;
    let totalBore = 0;
    let totalKgAll = 0;

    itemDrafts.forEach((it) => {
      const stats = getItemStats(it);
      grossAmount += stats.totalAmount;
      totalBore += it.boraCount;
      totalKgAll += stats.totalKg;
    });

    const advanceAmount = parseFloat(formAdvanceAmount) || 0;
    const deductions = parseFloat(formDeductions) || 0;
    const netPayable = Math.max(0, grossAmount - advanceAmount - deductions);

    return {
      grossAmount,
      totalBore,
      totalKgAll,
      advanceAmount,
      deductions,
      netPayable,
    };
  }, [itemDrafts, formAdvanceAmount, formDeductions]);

  // Submit New Consignment
  const handleSaveConsignment = () => run(async () => {
    if (!formSethName.trim()) {
      say(t('Please enter Seth / Vyapari name', 'कृपया सेठ / व्यापारी का नाम लिखें'));
      return;
    }
    if (itemDrafts.length === 0) {
      say(t('Please add at least one item', 'कम से कम एक सामान जोड़ें'));
      return;
    }

    const itemsPayload = itemDrafts.map((d) => {
      const stats = getItemStats(d);
      return {
        itemName: d.name,
        itemColor: d.color,
        boraCount: d.boraCount,
        totalGrams: Math.round(stats.totalKg * 1000),
        ratePaise: Math.round(stats.rateKg * 100),
        weightsJson: JSON.stringify(d.weights),
      };
    });

    await api.createSethConsignment({
      sethName: formSethName.trim(),
      sethPhone: formSethPhone.trim(),
      challanNo: '',
      note: '',
      advancePercent: 0,
      advancePaise: Math.round(draftCalculation.advanceAmount * 100),
      deductionsPaise: Math.round(draftCalculation.deductions * 100),
      addToStock: formAddToStock,
      items: itemsPayload,
    });

    setOpenNew(false);
    await Promise.all([loadData(), refresh()]);
    say(t('Seth consignment saved successfully!', 'सेठ के खाते में माल और हिसाब सफलतापूर्वक दर्ज हुआ!'));
  });

  // Change Status (Mark Sold or Settle)
  const handleUpdateStatus = (id: string, newStatus: 'IN_STOCK' | 'STOCK_SOLD' | 'SETTLED') => run(async () => {
    if (newStatus === 'SETTLED') {
      const target = data?.consignments.find((c) => c.id === id);
      if (target) {
        setSelectedConsignment(target);
        setSettleAmountText(String(target.netPayablePaise / 100));
        setOpenSettle(true);
        return;
      }
    }

    await api.updateSethStatus(id, { status: newStatus });
    await loadData();
    if (selectedConsignment?.id === id) {
      const updated = await api.sethOne(id);
      setSelectedConsignment(updated);
    }
    say(newStatus === 'STOCK_SOLD' ? t('Marked as stock sold!', 'माल बिक गया मार्क किया!') : t('Status updated', 'स्थिति बदली'));
  });

  // Final Settlement confirmation - Automatically pops up WhatsApp & PDF sharing!
  const handleConfirmSettle = () => run(async () => {
    if (!selectedConsignment) return;
    const paidRs = parseFloat(settleAmountText) || 0;
    const paidPaise = Math.round(paidRs * 100);

    const updated = await api.updateSethStatus(selectedConsignment.id, {
      status: 'SETTLED',
      paidPaise,
      paymentMode: settlePaymentMode,
    });

    setOpenSettle(false);
    setOpenDetail(false);
    setSelectedConsignment(updated);
    setOpenPostSettle(true); // Pops up WhatsApp & PDF Share modal immediately!
    await loadData();
    say(t('Settlement completed! Payment recorded.', 'हिसाब चुकता हुआ! भुगतान दर्ज हो गया।'));
  });

  // Format WhatsApp message with crisp alignment (Zero emojis)
  const formatWhatsAppText = (c: SethConsignment) => {
    const d = new Date(c.receivedAt);
    const arrivalDateStr = longDate(d);
    const settleDateStr = c.settledAt ? longDate(new Date(c.settledAt)) : longDate(new Date());
    const isSettled = c.status === 'SETTLED';

    const lines: string[] = [];
    lines.push(`==============================`);
    lines.push(`*${shop?.name || 'Mandi Ledger'}*`);
    if (shop?.address || shop?.phone) {
      lines.push([shop?.address, shop?.phone ? `Phone: ${shop.phone}` : ''].filter(Boolean).join(' · '));
    }
    lines.push(`==============================`);
    lines.push(`*SETH SETTLEMENT VOUCHER (हिसाब पर्ची)*`);
    lines.push(`==============================`);
    lines.push(`*Seth / Vyapari :* ${c.sethName}`);
    if (c.sethPhone) lines.push(`*Phone Number   :* ${c.sethPhone}`);
    lines.push(`*Arrival Date   :* ${arrivalDateStr}`);
    if (isSettled) lines.push(`*Settled Date   :* ${settleDateStr}`);
    lines.push(`==============================`);
    lines.push(`*COMMODITIES & BORA WEIGHING DETAILS:*`);
    lines.push(``);

    c.items.forEach((it, idx) => {
      let boriWeights: number[] = [];
      try { boriWeights = JSON.parse(it.weightsJson || '[]'); } catch { boriWeights = []; }
      const totalKg = (it.totalGrams / 1000).toFixed(1);
      const qtl = (it.totalGrams / 100000).toFixed(2);
      const rate = (it.ratePaise / 100).toFixed(2);
      const amt = rs(it.totalAmountPaise);

      lines.push(`${idx + 1}. *${it.itemName}*`);
      lines.push(`   - Bags  : ${it.boraCount} Bora`);
      lines.push(`   - Weight: ${totalKg} kg (${qtl} Quintal)`);
      lines.push(`   - Rate  : Rs ${rate} / kg`);
      lines.push(`   - Total : *Rs ${amt}*`);

      if (boriWeights.length > 0) {
        lines.push(`   - Bora Weights (kg): ${boriWeights.join(', ')}`);
      }
      lines.push(``);
    });

    lines.push(`==============================`);
    lines.push(`*FINANCIAL SUMMARY (अंतिम हिसाब सारांश):*`);
    lines.push(`- Gross Goods Total: Rs ${rs(c.grossAmountPaise)}`);
    if (c.advancePaise > 0) {
      lines.push(`- Less Advance Paid: -Rs ${rs(c.advancePaise)}`);
    }
    if (c.deductionsPaise > 0) {
      lines.push(`- Less Deductions / Freight: -Rs ${rs(c.deductionsPaise)}`);
    }
    lines.push(`------------------------------`);
    lines.push(`*Net Payable Amount: Rs ${rs(c.netPayablePaise)}*`);

    if (isSettled) {
      lines.push(`*Amount Paid       : Rs ${rs(c.paidPaise)} (${c.paymentMode})*`);
      lines.push(`*Balance Due       : Rs 0.00 (Fully Settled)*`);
      lines.push(`==============================`);
      lines.push(`*Status:* Payment Settled in Full.`);
    } else {
      lines.push(`==============================`);
      lines.push(`*Status:* Payment due upon stock clearance.`);
    }

    lines.push(`\nThank you.`);
    return lines.join('\n');
  };

  // Share Settlement Voucher on WhatsApp
  const handleShareWhatsApp = (c: SethConsignment) => {
    const text = formatWhatsAppText(c);
    const msg = encodeURIComponent(text);
    const phoneClean = c.sethPhone.replace(/[^0-9]/g, '');
    const url = phoneClean ? `https://wa.me/91${phoneClean}?text=${msg}` : `https://wa.me/?text=${msg}`;
    Linking.openURL(url).catch(() => say(t('Could not open WhatsApp', 'व्हाट्सएप नहीं खुल सका')));
  };

  // Print PDF Parchi with immaculate alignment (Zero emojis)
  const handlePrintParchi = async (c: SethConsignment) => {
    try {
      const isSettled = c.status === 'SETTLED';
      const arrivalDateStr = longDate(new Date(c.receivedAt));
      const settledDateStr = c.settledAt ? longDate(new Date(c.settledAt)) : longDate(new Date());

      const itemsHtml = c.items.map((it, i) => {
        let weights: number[] = [];
        try { weights = JSON.parse(it.weightsJson || '[]'); } catch { weights = []; }
        const totalKg = (it.totalGrams / 1000).toFixed(1);
        const qtl = (it.totalGrams / 100000).toFixed(2);
        const rate = (it.ratePaise / 100).toFixed(2);

        return `
          <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #dcd3c4;text-align:center;">${i + 1}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #dcd3c4;font-weight:bold;color:#201e1d;">${it.itemName}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #dcd3c4;text-align:center;font-weight:600;">${it.boraCount}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #dcd3c4;text-align:right;font-weight:600;">${totalKg} kg <small style="color:#645c50;">(${qtl} qtl)</small></td>
            <td style="padding:10px 8px;border-bottom:1px solid #dcd3c4;text-align:right;">Rs ${rate}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #dcd3c4;text-align:right;font-weight:bold;color:#8c491a;">Rs ${rs(it.totalAmountPaise)}</td>
          </tr>
          ${weights.length > 0 ? `
            <tr>
              <td colspan="6" style="padding:6px 12px 10px;border-bottom:1px solid #e5dec9;background-color:#fcf9f2;">
                <div style="font-size:11px;font-weight:700;color:#8c491a;margin-bottom:3px;">
                  Bora Weights (Tulai kg):
                </div>
                <div style="line-height:1.6;">
                  ${weights.map((w, idx) => `<span style="display:inline-block;background:#fff;border:1px solid #dcd3c4;border-radius:4px;padding:2px 6px;margin:2px 3px;font-size:11px;font-weight:600;">#${idx + 1}: <strong>${w} kg</strong></span>`).join('')}
                </div>
              </td>
            </tr>
          ` : ''}
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Mandi Ledger - Seth Settlement Voucher</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #201e1d; margin: 0; padding: 20px; background: #ffffff; font-size: 13px; line-height: 1.4; }
            .voucher-card { max-width: 800px; margin: 0 auto; border: 2px solid #8c491a; border-radius: 12px; padding: 24px; background: #ffffff; }
            .header-table { width: 100%; border-bottom: 2px solid #8c491a; padding-bottom: 14px; margin-bottom: 16px; }
            .shop-title { font-size: 24px; font-weight: 800; color: #8c491a; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .shop-sub { font-size: 12px; color: #645c50; margin: 2px 0; }
            .badge-paid { display: inline-block; background: #eef5e4; border: 1.5px solid #56633f; color: #3a4a28; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 12px; text-align: center; text-transform: uppercase; }
            .badge-unsettled { display: inline-block; background: #fde8e4; border: 1.5px solid #9c2a1c; color: #9c2a1c; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 12px; text-align: center; }
            .info-box { display: flex; justify-content: space-between; background: #f9f4ed; border: 1px solid #dcd3c4; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
            .info-col { width: 48%; }
            .info-row { display: flex; margin-bottom: 4px; font-size: 13px; }
            .info-lbl { width: 120px; font-weight: 600; color: #645c50; }
            .info-val { flex: 1; font-weight: 700; color: #201e1d; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #8c491a; color: #ffffff; padding: 9px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-wrap { display: flex; justify-content: flex-end; margin-top: 10px; margin-bottom: 24px; }
            .summary-card { width: 340px; background: #f9f4ed; border: 1.5px solid #dcd3c4; border-radius: 8px; padding: 14px 16px; }
            .sum-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13.5px; color: #474238; }
            .sum-row.total-bold { border-top: 2px solid #8c491a; padding-top: 8px; margin-top: 6px; font-size: 15.5px; font-weight: 800; color: #8c491a; }
            .sum-row.paid-bold { border-top: 1px solid #aebf92; padding-top: 6px; margin-top: 4px; font-size: 14px; font-weight: 700; color: #56633f; }
            .footer-sig { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 14px; border-top: 1px dashed #c0b6a5; }
            .sig-box { width: 200px; text-align: center; font-size: 12px; color: #645c50; }
            .sig-line { border-top: 1px solid #201e1d; margin-top: 40px; padding-top: 4px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td style="vertical-align:top;">
                  <div class="shop-title">${shop?.name || 'Mandi Ledger'}</div>
                  <div class="shop-sub">${[shop?.address, shop?.phone ? `Phone: ${shop.phone}` : ''].filter(Boolean).join(' · ')}</div>
                  <div style="font-size:15px;font-weight:700;color:#201e1d;margin-top:6px;">थोक आवक व अंतिम हिसाब पर्ची (Settlement Voucher)</div>
                </td>
                <td style="vertical-align:top;text-align:right;">
                  <div class="${isSettled ? 'badge-paid' : 'badge-unsettled'}">
                    ${isSettled ? 'PAID & SETTLED (चुकता)' : 'PAYMENT DUE (बाकी)'}
                  </div>
                  <div style="font-size:11.5px;color:#645c50;margin-top:8px;">
                    Arrival Date: <strong>${arrivalDateStr}</strong><br/>
                    ${isSettled ? `Settled Date: <strong>${settledDateStr}</strong>` : ''}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Seth & Settlement Details -->
            <div class="info-box">
              <div class="info-col">
                <div class="info-row"><span class="info-lbl">Seth / Vyapari:</span><span class="info-val">${c.sethName}</span></div>
                <div class="info-row"><span class="info-lbl">Phone Number:</span><span class="info-val">${c.sethPhone || '—'}</span></div>
              </div>
              <div class="info-col">
                <div class="info-row"><span class="info-lbl">Payment Status:</span><span class="info-val" style="color:${isSettled ? '#56633f' : '#b2622d'}">${isSettled ? 'Fully Settled' : 'Payment Due'}</span></div>
                ${isSettled ? `<div class="info-row"><span class="info-lbl">Payment Mode:</span><span class="info-val">${c.paymentMode}</span></div>` : ''}
              </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:6%;text-align:center;">#</th>
                  <th style="width:32%;text-align:left;">Item / Commodity</th>
                  <th style="width:12%;text-align:center;">Total Bags</th>
                  <th style="width:18%;text-align:right;">Total Weight</th>
                  <th style="width:14%;text-align:right;">Rate (Rs/kg)</th>
                  <th style="width:18%;text-align:right;">Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Calculation Voucher Summary -->
            <div class="summary-wrap">
              <div class="summary-card">
                <div class="sum-row">
                  <span>Gross Goods Total:</span>
                  <span style="font-weight:700;">Rs ${rs(c.grossAmountPaise)}</span>
                </div>
                ${c.advancePaise > 0 ? `
                  <div class="sum-row" style="color:#8c491a;">
                    <span>(-) Advance Paid:</span>
                    <span style="font-weight:700;">-Rs ${rs(c.advancePaise)}</span>
                  </div>
                ` : ''}
                ${c.deductionsPaise > 0 ? `
                  <div class="sum-row" style="color:#645c50;">
                    <span>(-) Deductions / Freight:</span>
                    <span style="font-weight:700;">-Rs ${rs(c.deductionsPaise)}</span>
                  </div>
                ` : ''}
                <div class="sum-row total-bold">
                  <span>Net Due to Seth:</span>
                  <span>Rs ${rs(c.netPayablePaise)}</span>
                </div>
                ${isSettled ? `
                  <div class="sum-row paid-bold">
                    <span>Amount Paid:</span>
                    <span>Rs ${rs(c.paidPaise)} (${c.paymentMode})</span>
                  </div>
                  <div class="sum-row" style="font-size:12px;color:#56633f;font-weight:bold;margin-top:2px;">
                    <span>Balance Due:</span>
                    <span>Rs 0.00 (Fully Settled)</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Signature Lines -->
            <div class="footer-sig">
              <div class="sig-box">
                <div class="sig-line">Seth / Supplier Signature</div>
              </div>
              <div class="sig-box">
                <div class="sig-line">Authorized Signatory</div>
              </div>
            </div>

            <div style="text-align:center;font-size:11px;color:#82796a;margin-top:20px;">
              Computer-generated official settlement voucher.
            </div>
          </div>
        </body>
        </html>
      `;
      await Print.printAsync({ html });
    } catch {
      say(t('Print failed', 'प्रिंट नहीं हो सका'));
    }
  };

  const consignments = data?.consignments ?? [];
  const summary = data?.summary;

  return (
    <Screen en="Seth Khata & Bulk" hi="सेठ खाता व थोक आवक">
      {/* ── TOP KPI / SUMMARY BAR ── */}
      <View style={{ flexDirection: 'row', gap: 9, marginBottom: 14 }}>
        <View style={[styles.kpiCard, { flex: 1.2, backgroundColor: C.a200, borderColor: C.a400 }]}>
          <Txt size={11} color={C.a700} weight={600} hi={lang === 'hi'}>
            {t('Total Balance Due', 'देने योग्य कुल बाकी')}
          </Txt>
          <Txt heading size={22} color={C.a700} style={{ marginVertical: 2 }}>
            ₹{rs(summary?.balanceDuePaise ?? 0)}
          </Txt>
          <Txt size={10} color={C.n700}>
            {summary?.pendingLots ?? 0} {t('pending settlements', 'लॉट का हिसाब बाकी')}
          </Txt>
        </View>

        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Txt size={11} color={C.n700} weight={600} hi={lang === 'hi'}>
            {t('Advance Given', 'दिया गया अग्रिम')}
          </Txt>
          <Txt heading size={18} color={C.text} style={{ marginVertical: 2 }}>
            ₹{rs(summary?.totalAdvancePaise ?? 0)}
          </Txt>
          <Txt size={10} color={C.g700}>
            {summary?.sethCount ?? 0} {t('seths / vyaparis', 'सेठ / व्यापारी')}
          </Txt>
        </View>
      </View>

      {/* ── ACTION BAR & SEARCH ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider, borderRadius: R.md, paddingHorizontal: 10, height: 42 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.n600} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <Circle cx="11" cy="11" r="8" />
            <Path d="m21 21-4.35-4.35" />
          </Svg>
          <TextInput
            placeholder={t('Search Seth or item...', 'सेठ या सामान खोजें...')}
            placeholderTextColor={C.n600}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadData}
            style={{ flex: 1, fontFamily: lang === 'hi' ? F.hi : F.body, fontSize: 13, color: C.text }}
          />
          {searchQuery ? (
            <Pressable onPress={() => { setSearchQuery(''); loadData(); }}>
              <Txt size={12} weight={600} color={C.n600}>Clear</Txt>
            </Pressable>
          ) : null}
        </View>

        <Btn
          label={t('+ New Lot', '+ नई आवक')}
          onPress={handleOpenNewLot}
          style={{ height: 42, paddingHorizontal: 14 }}
        />
      </View>

      {/* ── STATUS FILTER CHIPS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 14 }}>
        <Chip label={t('All Lots', 'सभी लॉट')} on={statusFilter === 'ALL'} onPress={() => setStatusFilter('ALL')} />
        <Chip label={t('In Stock', 'स्टॉक में')} on={statusFilter === 'IN_STOCK'} onPress={() => setStatusFilter('IN_STOCK')} />
        <Chip label={t('Sold (Due)', 'माल बिका (बाकी)')} on={statusFilter === 'STOCK_SOLD'} onPress={() => setStatusFilter('STOCK_SOLD')} />
        <Chip label={t('Settled', 'चुकता हिसाब')} on={statusFilter === 'SETTLED'} onPress={() => setStatusFilter('SETTLED')} />
      </ScrollView>

      {/* ── CONSIGNMENT CARDS LIST ── */}
      {consignments.length === 0 ? (
        <Empty
          en="No Seth consignments yet. Tap '+ New Lot' to add bulk arrivals."
          hi="अभी तक कोई सेठ आवक दर्ज नहीं है। ऊपर '+ नई आवक' दबाकर थोक माल दर्ज करें।"
          action={t('Add consignment', 'माल दर्ज करें')}
          onAction={handleOpenNewLot}
        />
      ) : (
        <View style={{ gap: 12, paddingBottom: 40 }}>
          {consignments.map((c) => {
            const isSettled = c.status === 'SETTLED';
            const isSold = c.status === 'STOCK_SOLD';
            const totalBags = c.items.reduce((acc, it) => acc + it.boraCount, 0);
            const totalKg = c.items.reduce((acc, it) => acc + it.totalGrams / 1000, 0);

            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedConsignment(c);
                  setOpenDetail(true);
                }}
                style={styles.card}
              >
                {/* Header: Seth Info + Status badge */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Avatar text={initials(c.sethName)} size={36} bg={C.a200} fg={C.a700} />
                    <View>
                      <Txt size={15} weight={700}>{c.sethName}</Txt>
                      <Txt size={11} color={C.n700}>
                        {longDate(new Date(c.receivedAt))}
                      </Txt>
                    </View>
                  </View>

                  <View style={[
                    styles.badge,
                    isSettled ? styles.badgeSettled : isSold ? styles.badgeSold : styles.badgeStock
                  ]}>
                    <Txt size={10} weight={700} color={isSettled ? '#3a4a28' : isSold ? '#9c2a1c' : '#b2622d'}>
                      {isSettled ? t('SETTLED', 'चुकता') : isSold ? t('STOCK SOLD', 'माल बिका') : t('IN STOCK', 'स्टॉक में')}
                    </Txt>
                  </View>
                </View>

                {/* Items in this Lot Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                  {c.items.map((it) => (
                    <View key={it.id} style={styles.itemTag}>
                      <Pill color={it.itemColor} w={6} h={14} />
                      <Txt size={12} weight={600}>{it.itemName}</Txt>
                      <Txt size={11} color={C.n700}>
                        {it.boraCount} {t('bora', 'बोरा')} ({(it.totalGrams / 1000).toFixed(0)} kg)
                      </Txt>
                    </View>
                  ))}
                </View>

                {/* Calculation Summary strip */}
                <View style={styles.calcStrip}>
                  <View>
                    <Txt size={10.5} color={C.n700}>{t('Gross Total', 'कुल माल')}</Txt>
                    <Txt size={13} weight={600}>₹{rs(c.grossAmountPaise)}</Txt>
                  </View>

                  {c.advancePaise > 0 && (
                    <View>
                      <Txt size={10.5} color={C.a700}>
                        {t('Advance', 'अग्रिम')}
                      </Txt>
                      <Txt size={13} weight={600} color={C.a700}>-₹{rs(c.advancePaise)}</Txt>
                    </View>
                  )}

                  <View style={{ alignItems: 'flex-end', marginLeft: 'auto' }}>
                    <Txt size={10.5} color={isSettled ? C.g700 : C.a700} weight={700}>
                      {isSettled ? t('Paid', 'भुगतान हुआ') : t('Net Due', 'बाकी देना है')}
                    </Txt>
                    <Txt heading size={16} color={isSettled ? C.g700 : C.a700}>
                      ₹{rs(isSettled ? c.paidPaise : c.netPayablePaise)}
                    </Txt>
                  </View>
                </View>

                {/* Quick Card Footer Action */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.divider }}>
                  <Txt size={11} color={C.n700}>
                    {totalBags} {t('bags', 'बोरी')} · {totalKg.toFixed(1)} kg
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {!isSettled && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(c.id, isSold ? 'SETTLED' : 'STOCK_SOLD');
                        }}
                        style={[styles.smallBtn, { backgroundColor: isSold ? C.g100 : C.n200 }]}
                      >
                        <Txt size={11} weight={600} color={isSold ? C.g700 : C.text}>
                          {isSold ? t('Settle Pay', 'हिसाब चुकता') : t('Mark Sold', 'माल बिका')}
                        </Txt>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShareWhatsApp(c);
                      }}
                      style={[styles.smallBtn, { backgroundColor: '#e7f5e8' }]}
                    >
                      <Txt size={11} weight={600} color="#25D366">WhatsApp</Txt>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: NEW BULK CONSIGNMENT (नया माल आवक व तुलाई हिसाब) ── */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <Sheet visible={openNew} onClose={() => setOpenNew(false)}>
        <Txt heading size={20} style={{ marginBottom: 4 }}>
          {t('New Seth Consignment', 'नया माल (सेठ थोक आवक)')}
        </Txt>
        <Txt size={12} color={C.n700} style={{ marginBottom: 14 }}>
          {t('Bulk purchase, bag-by-bag weighing, advance deduction and settlement ledger', 'थोक खरीद, अलग-अलग बोरा वजन, अग्रिम कटौती व अंतिम हिसाब')}
        </Txt>

        {/* ── SETH DETAILS ── */}
        <Kicker en="1. Seth / Supplier Details" hi="1. सेठ / व्यापारी विवरण" />

        <Field
          label={t('Seth / Vyapari Name *', 'सेठ / व्यापारी का नाम *')}
          placeholder={t('Enter Seth name', 'सेठ का नाम दर्ज करें')}
          value={formSethName}
          onChangeText={setFormSethName}
        />

        <Field
          label={t('Phone (Optional)', 'फोन नंबर (ऐच्छिक)')}
          placeholder={t('10-digit mobile number', '10 अंकों का मोबाइल नंबर')}
          keyboardType="phone-pad"
          value={formSethPhone}
          onChangeText={setFormSethPhone}
        />

        {/* ── ITEMS & VARIABLE BORA WEIGHTS ── */}
        <Kicker en="2. Commodities & Variable Bora Weights" hi="2. सामान व अलग-अलग बोरा वजन (तुलाई)" style={{ marginTop: 10 }} />
        
        {/* Preset quick item selector chips (only Aaloo, Pyaaz, Adrak, Lehsun) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {PRESET_VEGGIES.map((v) => {
            const isAdded = itemDrafts.some((d) => d.name === v.name || d.name === v.en);
            return (
              <Pressable
                key={v.name}
                onPress={() => addItemDraft(v.name, v.color)}
                style={[
                  styles.presetChip,
                  isAdded && { borderColor: C.a700, backgroundColor: C.a200 }
                ]}
              >
                <Txt size={12} weight={600} color={isAdded ? C.a700 : C.text}>
                  + {v.name}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {/* Custom Item Adder */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          <TextInput
            placeholder={t('+ Custom vegetable / item name', '+ अन्य सामान का नाम लिखें')}
            placeholderTextColor={C.n600}
            value={customItemName}
            onChangeText={setCustomItemName}
            style={styles.inputMini}
          />
          <Btn
            label={t('Add', 'जोड़ें')}
            onPress={() => {
              if (customItemName.trim()) {
                addItemDraft(customItemName.trim());
                setCustomItemName('');
              }
            }}
            style={{ paddingHorizontal: 14 }}
          />
        </View>

        {/* Prompt when no items added yet */}
        {itemDrafts.length === 0 && (
          <View style={styles.emptyItemsPrompt}>
            <Txt size={12.5} color={C.n700} style={{ textAlign: 'center' }}>
              {t('Tap above on आलू, प्याज, अदरक or लहसुन to add items and enter bag weights.', 'सामान जोड़ने के लिए ऊपर आलू, प्याज, अदरक या लहसुन पर टैप करें।')}
            </Txt>
          </View>
        )}

        {/* Draft Items List */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          {itemDrafts.map((item) => {
            const stats = getItemStats(item);
            const weighedCount = item.weights.length;

            return (
              <View key={item.id} style={styles.itemBox}>
                {/* Item Card Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Pill color={item.color} w={8} h={18} />
                    <Txt size={15} weight={700}>{item.name}</Txt>
                  </View>
                  <Pressable onPress={() => removeItemDraft(item.id)}>
                    <Txt size={12} weight={600} color="#9c2a1c">{t('Remove', 'हटाएं')}</Txt>
                  </Pressable>
                </View>

                {/* Bora count & Rate row */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={11} color={C.n700} weight={600} style={{ marginBottom: 4 }}>
                      {t('Total Bags / Bora', 'कुल बोरा संख्या')}
                    </Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <RoundBtn
                        size={28}
                        label="−"
                        onPress={() => setItemDrafts((prev) => prev.map((it) => it.id === item.id ? { ...it, boraCount: Math.max(1, it.boraCount - 1) } : it))}
                      />
                      <TextInput
                        keyboardType="numeric"
                        value={String(item.boraCount)}
                        onChangeText={(txt) => {
                          const n = parseInt(txt) || 0;
                          setItemDrafts((prev) => prev.map((it) => it.id === item.id ? { ...it, boraCount: n } : it));
                        }}
                        style={[styles.inputMini, { width: 50, textAlign: 'center', fontWeight: 'bold' }]}
                      />
                      <RoundBtn
                        size={28}
                        label="+"
                        onPress={() => setItemDrafts((prev) => prev.map((it) => it.id === item.id ? { ...it, boraCount: it.boraCount + 1 } : it))}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Txt size={11} color={C.n700} weight={600} style={{ marginBottom: 4 }}>
                      {t('Rate (₹/kg)', 'भाव (₹ प्रति किग्रा)')}
                    </Txt>
                    <TextInput
                      keyboardType="numeric"
                      value={item.ratePerKgText}
                      onChangeText={(txt) => setItemDrafts((prev) => prev.map((it) => it.id === item.id ? { ...it, ratePerKgText: txt } : it))}
                      placeholder="e.g. 18.50"
                      style={[styles.inputMini, { fontWeight: 'bold' }]}
                    />
                  </View>
                </View>

                {/* Variable Weight Input Section */}
                <View style={styles.weighingSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Txt size={11} weight={700} color={C.a700}>
                      {t('Individual Bora Weights (Tulai)', 'अलग-अलग बोरी का वजन (तुलाई दर्ज करें)')}
                    </Txt>
                    {item.weights.length > 0 && (
                      <Pressable onPress={() => clearWeights(item.id)}>
                        <Txt size={10.5} color={C.n700}>{t('Clear', 'साफ़ करें')}</Txt>
                      </Pressable>
                    )}
                  </View>

                  <TextInput
                    placeholder={t('Type or paste weights separated by commas or spaces: e.g. 52.4, 51.0, 49.8, 50.5...', 'वजन दर्ज करें (उदा: 52.4, 51.0, 49.8, 50.5...)')}
                    placeholderTextColor={C.n600}
                    value={item.weightInputText}
                    onChangeText={(txt) => updateItemWeights(item.id, txt)}
                    multiline
                    style={styles.weightsInput}
                  />

                  {/* Fast shortcut buttons to add standard mandi bori weights */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    <Txt size={10} color={C.n700}>{t('Quick Add:', 'त्वरित वजन:')}</Txt>
                    {[50, 51, 52, 49, 48].map((w) => (
                      <Pressable
                        key={w}
                        onPress={() => addQuickWeight(item.id, w)}
                        style={styles.weightBadgeQuick}
                      >
                        <Txt size={10.5} weight={600}>+{w}kg</Txt>
                      </Pressable>
                    ))}
                  </View>

                  {/* Live Bora Weights Tag Cloud */}
                  {item.weights.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Txt size={10.5} color={C.n700} style={{ marginBottom: 4 }}>
                        {t('Entered', 'दर्ज तुलाई')}: {weighedCount} / {item.boraCount} {t('bags', 'बोरी')} · {t('Avg', 'औसत')}: {(stats.totalKg / weighedCount).toFixed(1)} kg
                      </Txt>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                        {item.weights.map((w, wIdx) => (
                          <View key={wIdx} style={styles.boraTag}>
                            <Txt size={9.5} color={C.n700}>#{wIdx + 1}</Txt>
                            <Txt size={11} weight={700}>{w} kg</Txt>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Subtotal Footer */}
                <View style={styles.itemSubtotalRow}>
                  <Txt size={12} color={C.n700}>
                    {stats.totalKg.toFixed(1)} kg ({(stats.totalKg / 100).toFixed(2)} qtl) @ ₹{stats.rateKg}/kg
                  </Txt>
                  <Txt heading size={15} color={C.a700}>
                    = ₹{rs(stats.totalAmount * 100)}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── ADVANCE & DEDUCTIONS (DIRECT AMOUNT) ── */}
        <Kicker en="3. Advance Payment & Final Settlement" hi="3. अग्रिम भुगतान व अंतिम हिसाब" />
        <View style={styles.advanceCard}>
          {/* Gross Total Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.divider }}>
            <Txt size={13.5} weight={600}>{t('Gross Goods Total', 'कुल माल की कीमत (Gross):')}</Txt>
            <Txt heading size={19}>₹{rs(draftCalculation.grossAmount * 100)}</Txt>
          </View>

          {/* Advance Amount (₹) */}
          <View style={{ marginTop: 10 }}>
            <Field
              label={t('Advance Amount (₹)', 'अग्रिम भुगतान राशि (₹ Advance Paid)')}
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={formAdvanceAmount}
              onChangeText={setFormAdvanceAmount}
            />
          </View>

          {/* Other Deductions (₹) */}
          <Field
            label={t('Other Deductions / Bhada / Tulai (₹ Optional)', 'अन्य कटौती (गाड़ी भाड़ा / हम्माली / तुलाई) (₹ ऐच्छिक)')}
            placeholder="e.g. 500"
            keyboardType="numeric"
            value={formDeductions}
            onChangeText={setFormDeductions}
          />

          {/* Final Net Payable Highlight Box - Beautifully Aligned & No Clipping */}
          <View style={styles.netHighlightBox}>
            <View style={{ marginBottom: 8 }}>
              <Txt size={13} weight={700} color={C.a800} hi={lang === 'hi'}>
                {t('Final Balance to Pay Seth at Settlement', 'सेठ को देने योग्य अंतिम शुद्ध हिसाब')}
              </Txt>
              <Txt size={11} color={C.n700} style={{ marginTop: 2 }}>
                {t('Calculation: Gross Goods − Advance Paid − Other Deductions', 'हिसाब = कुल माल − अग्रिम भुगतान − अन्य कटौती')}
              </Txt>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(198, 113, 57, 0.35)' }}>
              <Txt size={13.5} weight={700} color={C.a800}>
                {t('Total Amount to Pay:', 'अंतिम कुल देय राशि:')}
              </Txt>
              <Txt heading size={24} color={C.a700}>
                ₹{rs(draftCalculation.netPayable * 100)}
              </Txt>
            </View>
          </View>
        </View>

        {/* Toggle add to store stock */}
        <Pressable
          onPress={() => setFormAddToStock(!formAddToStock)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 }}
        >
          <View style={[styles.checkbox, formAddToStock && styles.checkboxOn]}>
            {formAddToStock && (
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 6 9 17l-5-5" />
              </Svg>
            )}
          </View>
          <Txt size={12} weight={600}>
            {t('Automatically add kilograms to store inventory stock', 'स्टॉक में यह सामान (किलोग्राम) तुरंत जोड़ें')}
          </Txt>
        </Pressable>

        {/* Save button */}
        <Btn
          label={t('Save to Seth Khata', 'सेठ के खाते में दर्ज करें')}
          onPress={handleSaveConsignment}
          style={{ marginTop: 8 }}
        />
      </Sheet>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: SETH DETAIL & SETTLEMENT PARCHI (हिसाब व पर्ची) ── */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      <Sheet visible={openDetail && Boolean(selectedConsignment)} onClose={() => setOpenDetail(false)}>
        {selectedConsignment && (
          <View>
            {/* Header info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Txt heading size={20}>{selectedConsignment.sethName}</Txt>
                <Txt size={12} color={C.n700}>
                  {longDate(new Date(selectedConsignment.receivedAt))}
                </Txt>
              </View>

              <View style={[
                styles.badge,
                selectedConsignment.status === 'SETTLED' ? styles.badgeSettled : selectedConsignment.status === 'STOCK_SOLD' ? styles.badgeSold : styles.badgeStock
              ]}>
                <Txt size={11} weight={700} color={selectedConsignment.status === 'SETTLED' ? '#3a4a28' : selectedConsignment.status === 'STOCK_SOLD' ? '#9c2a1c' : '#b2622d'}>
                  {selectedConsignment.status === 'SETTLED' ? t('SETTLED', 'चुकता') : selectedConsignment.status === 'STOCK_SOLD' ? t('STOCK SOLD', 'माल बिका') : t('IN STOCK', 'स्टॉक में')}
                </Txt>
              </View>
            </View>

            {/* Itemized Table */}
            <Kicker en="Item-wise Breakdown" hi="सामान व बोरा दर बोरा हिसाब" />
            <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider, borderRadius: R.md, padding: 10, marginBottom: 14 }}>
              {selectedConsignment.items.map((it, idx) => {
                let weights: number[] = [];
                try { weights = JSON.parse(it.weightsJson || '[]'); } catch { weights = []; }

                return (
                  <View key={it.id} style={{ borderBottomWidth: idx < selectedConsignment.items.length - 1 ? 1 : 0, borderBottomColor: C.divider, paddingVertical: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Pill color={it.itemColor} w={6} h={16} />
                        <Txt size={14} weight={700}>{it.itemName}</Txt>
                        <Txt size={11} color={C.n700}>({it.boraCount} बोरा)</Txt>
                      </View>
                      <Txt heading size={15} color={C.text}>
                        ₹{rs(it.totalAmountPaise)}
                      </Txt>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Txt size={11.5} color={C.n700}>
                        {wt(it.totalGrams)} @ ₹{(it.ratePaise / 100).toFixed(2)}/kg
                      </Txt>
                      <Txt size={11} color={C.n700}>
                        {weights.length > 0 ? `${weights.length} बोरी वजन दर्ज` : 'औसत वजन'}
                      </Txt>
                    </View>

                    {/* Bora weights mini strip */}
                    {weights.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, marginTop: 6 }}>
                        {weights.map((w, wIdx) => (
                          <View key={wIdx} style={styles.boraTag}>
                            <Txt size={9} color={C.n700}>#{wIdx + 1}</Txt>
                            <Txt size={10.5} weight={600}>{w}kg</Txt>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Final Calculation Voucher */}
            <View style={styles.voucherBox}>
              <View style={styles.voucherRow}>
                <Txt size={13}>{t('Gross Total', 'कुल माल (Gross):')}</Txt>
                <Txt size={14} weight={700}>₹{rs(selectedConsignment.grossAmountPaise)}</Txt>
              </View>

              {selectedConsignment.advancePaise > 0 && (
                <View style={styles.voucherRow}>
                  <Txt size={13} color={C.a700}>
                    {t('Advance Paid', 'अग्रिम भुगतान')}:
                  </Txt>
                  <Txt size={14} weight={700} color={C.a700}>
                    -₹{rs(selectedConsignment.advancePaise)}
                  </Txt>
                </View>
              )}

              {selectedConsignment.deductionsPaise > 0 && (
                <View style={styles.voucherRow}>
                  <Txt size={13} color={C.n700}>{t('Mandi Deductions / Freight', 'मंडी कटौती / भाड़ा:')}</Txt>
                  <Txt size={14} weight={700} color={C.n700}>-₹{rs(selectedConsignment.deductionsPaise)}</Txt>
                </View>
              )}

              <View style={[styles.voucherRow, { borderTopWidth: 1, borderTopColor: C.a400, paddingTop: 8, marginTop: 4 }]}>
                <Txt heading size={16} color={C.a700}>{t('Net Due to Seth', 'अंतिम देय राशि:')}</Txt>
                <Txt heading size={20} color={C.a700}>₹{rs(selectedConsignment.netPayablePaise)}</Txt>
              </View>

              {selectedConsignment.status === 'SETTLED' && (
                <View style={{ marginTop: 8, backgroundColor: C.g100, borderRadius: R.sm, padding: 8 }}>
                  <Txt size={11} color={C.g700} weight={700}>
                    {t('Payment Settled', 'भुगतान चुकता हुआ')}: ₹{rs(selectedConsignment.paidPaise)} ({selectedConsignment.paymentMode})
                  </Txt>
                  {selectedConsignment.settledAt && (
                    <Txt size={10} color={C.g700}>
                      {longDate(new Date(selectedConsignment.settledAt))}
                    </Txt>
                  )}
                </View>
              )}
            </View>

            {/* Actions: Mark Sold / Settle Payment / WhatsApp / Print */}
            <View style={{ gap: 8, marginTop: 14 }}>
              {selectedConsignment.status === 'IN_STOCK' && (
                <Btn
                  variant="plain"
                  label={t('Mark Stock as Sold (Ready to Settle)', 'माल बिक गया मार्क करें (हिसाब तैयार)')}
                  onPress={() => handleUpdateStatus(selectedConsignment.id, 'STOCK_SOLD')}
                  style={{ backgroundColor: '#fff0e6', borderColor: C.a700, borderWidth: 1 }}
                />
              )}

              {selectedConsignment.status !== 'SETTLED' && (
                <Btn
                  label={t('Settle & Record Payment to Seth', 'हिसाब चुकता करें व भुगतान दर्ज करें')}
                  onPress={() => {
                    setSettleAmountText(String(selectedConsignment.netPayablePaise / 100));
                    setOpenSettle(true);
                  }}
                />
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn
                  variant="plain"
                  label="WhatsApp हिसाब"
                  onPress={() => handleShareWhatsApp(selectedConsignment)}
                  style={{ flex: 1, backgroundColor: '#25D366' }}
                  textStyle={{ color: C.white, fontWeight: 'bold' }}
                />
                <Btn
                  variant="secondary"
                  label="प्रिंट / PDF"
                  onPress={() => handlePrintParchi(selectedConsignment)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        )}
      </Sheet>

      {/* ── MODAL 3: CONFIRM PAYMENT SETTLEMENT ── */}
      <Sheet visible={openSettle} onClose={() => setOpenSettle(false)}>
        <Txt heading size={18} style={{ marginBottom: 6 }}>
          {t('Record Settlement Payment', 'सेठ को अंतिम भुगतान दर्ज करें')}
        </Txt>
        <Txt size={12} color={C.n700} style={{ marginBottom: 12 }}>
          {t('Pay remaining net balance after deducting advance & expenses', 'अग्रिम व कटौती घटाकर बाकी रकम चुकता करें')}
        </Txt>

        <Field
          label={t('Payment Amount (₹)', 'भुगतान राशि (₹)')}
          keyboardType="numeric"
          value={settleAmountText}
          onChangeText={setSettleAmountText}
        />

        <Txt size={11} color={C.n700} weight={600} style={{ marginBottom: 6 }}>
          {t('Payment Mode', 'भुगतान का तरीका')}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {['CASH', 'UPI', 'BANK'].map((m) => (
            <Chip
              key={m}
              label={m}
              on={settlePaymentMode === m}
              onPress={() => setSettlePaymentMode(m)}
            />
          ))}
        </View>

        <Btn
          label={t('Confirm Payment & Settle', 'भुगतान पक्का करें व चुकता करें')}
          onPress={handleConfirmSettle}
        />
      </Sheet>

      {/* ── MODAL 4: POST-SETTLEMENT SUCCESS & AUTO SHARE/PRINT POPUP (Zero emojis) ── */}
      <Sheet visible={openPostSettle && Boolean(selectedConsignment)} onClose={() => setOpenPostSettle(false)}>
        {selectedConsignment && (
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            {/* SVG Checkmark Circle */}
            <View style={styles.successIconCircle}>
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#56633f" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 6 9 17l-5-5" />
              </Svg>
            </View>

            <Txt heading size={21} style={{ textAlign: 'center', marginBottom: 4 }}>
              {t('Settlement Completed!', 'हिसाब पूर्णतः चुकता हुआ!')}
            </Txt>
            <Txt size={12.5} color={C.n700} style={{ textAlign: 'center', marginBottom: 16 }}>
              {selectedConsignment.sethName} {t('payment recorded successfully. Share or download PDF voucher below:', 'का भुगतान दर्ज हो चुका है। नीचे दिए बटन से WhatsApp पर भेजें या PDF पर्ची डाउनलोड करें:')}
            </Txt>

            {/* Quick Summary Card */}
            <View style={styles.settleSummaryBox}>
              <View style={styles.settleSummaryRow}>
                <Txt size={12.5} color={C.n700}>{t('Seth Name', 'सेठ का नाम')}:</Txt>
                <Txt size={13} weight={700}>{selectedConsignment.sethName}</Txt>
              </View>

              <View style={styles.settleSummaryRow}>
                <Txt size={12.5} color={C.n700}>{t('Gross Goods Total', 'कुल माल (Gross)')}:</Txt>
                <Txt size={13} weight={700}>₹{rs(selectedConsignment.grossAmountPaise)}</Txt>
              </View>

              {selectedConsignment.advancePaise > 0 && (
                <View style={styles.settleSummaryRow}>
                  <Txt size={12.5} color={C.a700}>{t('Advance Paid', 'अग्रिम कटौती')}:</Txt>
                  <Txt size={13} weight={700} color={C.a700}>-₹{rs(selectedConsignment.advancePaise)}</Txt>
                </View>
              )}

              {selectedConsignment.deductionsPaise > 0 && (
                <View style={styles.settleSummaryRow}>
                  <Txt size={12.5} color={C.n700}>{t('Other Deductions', 'अन्य कटौती / भाड़ा')}:</Txt>
                  <Txt size={13} weight={700} color={C.n700}>-₹{rs(selectedConsignment.deductionsPaise)}</Txt>
                </View>
              )}

              <View style={[styles.settleSummaryRow, { borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 8, marginTop: 4 }]}>
                <Txt size={13.5} weight={700} color={C.g700}>{t('Paid Settlement', 'चुकाई गई शुद्ध रकम')}:</Txt>
                <Txt heading size={18} color={C.g700}>
                  ₹{rs(selectedConsignment.paidPaise)} ({selectedConsignment.paymentMode})
                </Txt>
              </View>

              <View style={[styles.settleSummaryRow, { marginTop: 4 }]}>
                <Txt size={11.5} color={C.g700} weight={600}>{t('Balance Due', 'बकाया रकम')}:</Txt>
                <Txt size={12} weight={700} color={C.g700}>₹0.00 (पूर्ण चुकता / Settled)</Txt>
              </View>
            </View>

            {/* Prominent Action Buttons */}
            <View style={{ width: '100%', gap: 10 }}>
              <Btn
                variant="plain"
                label={t('Share Slip on WhatsApp', 'WhatsApp पर पूरी पर्ची भेजें')}
                onPress={() => handleShareWhatsApp(selectedConsignment)}
                style={{ backgroundColor: '#25D366', paddingVertical: 14 }}
                textStyle={{ color: C.white, fontWeight: '700', fontSize: 15 }}
              />

              <Btn
                variant="secondary"
                label={t('View & Print PDF Voucher', 'PDF हिसाब पर्ची देखें व डाउनलोड करें')}
                onPress={() => handlePrintParchi(selectedConsignment)}
                style={{ backgroundColor: C.surface, borderColor: C.a700, borderWidth: 1.5, paddingVertical: 14 }}
                textStyle={{ color: C.a700, fontWeight: '700', fontSize: 15 }}
              />

              <Btn
                variant="plain"
                label={t('Done / Close', 'सम्पन्न / बंद करें')}
                onPress={() => setOpenPostSettle(false)}
                style={{ marginTop: 2 }}
              />
            </View>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpiCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    padding: 12,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.lg,
    padding: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.sm,
  },
  badgeStock: { backgroundColor: '#fbece1' },
  badgeSold: { backgroundColor: '#fde8e4' },
  badgeSettled: { backgroundColor: '#eef5e4' },
  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.n100,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  calcStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.n100,
    borderRadius: R.md,
    padding: 10,
    marginTop: 8,
    gap: 14,
  },
  smallBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: R.sm,
  },
  presetChip: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyItemsPrompt: {
    padding: 14,
    backgroundColor: C.n100,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemBox: {
    backgroundColor: C.n100,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    padding: 12,
  },
  inputMini: {
    flex: 1,
    height: 38,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    fontSize: 13,
    color: C.text,
  },
  weighingSection: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.sm,
    padding: 10,
    marginTop: 6,
  },
  weightsInput: {
    backgroundColor: C.n100,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.sm,
    padding: 8,
    fontSize: 12,
    color: C.text,
    minHeight: 46,
    textAlignVertical: 'top',
  },
  weightBadgeQuick: {
    backgroundColor: C.a200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  boraTag: {
    alignItems: 'center',
    backgroundColor: C.n100,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  advanceCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    padding: 12,
    marginBottom: 10,
  },
  netHighlightBox: {
    backgroundColor: C.a200,
    borderWidth: 1.5,
    borderColor: C.a400,
    borderRadius: R.md,
    padding: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: C.n600,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  checkboxOn: {
    backgroundColor: C.a700,
    borderColor: C.a700,
  },
  voucherBox: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    padding: 12,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef5e4',
    borderWidth: 2,
    borderColor: '#56633f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  settleSummaryBox: {
    width: '100%',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.divider,
    borderRadius: R.md,
    padding: 14,
    marginBottom: 18,
  },
  settleSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
});
