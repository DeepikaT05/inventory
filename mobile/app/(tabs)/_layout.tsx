import { Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, R } from '../../src/theme';
import { Txt } from '../../src/ui';

import { useStore } from '../../src/store';

type TabKey = 'index' | 'sale' | 'inventory' | 'seth' | 'khata' | 'report';

// Which tab lights up for each route — matches the prototype (Bill → Sale, Arrivals → Stock, …).
const OWNER: Record<string, TabKey> = {
  index: 'index', sale: 'sale', 'bill/[id]': 'sale', inventory: 'inventory', arrivals: 'inventory',
  seth: 'seth', khata: 'khata', report: 'report', rates: 'report', settings: 'report', items: 'report',
};

const icon = (key: TabKey, color: string) => {
  const p = { stroke: color, strokeWidth: 2.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      {key === 'index' && <><Path d="M3 10.5 12 3l9 7.5" {...p} /><Path d="M5 9.8V21h14V9.8" {...p} /></>}
      {key === 'sale' && <><Circle cx={12} cy={12} r={9} {...p} /><Path d="M12 8v8M8 12h8" {...p} /></>}
      {key === 'inventory' && <><Path d="M21 8 12 3 3 8v8l9 5 9-5z" {...p} /><Path d="M3 8l9 5 9-5" {...p} /><Path d="M12 13v8" {...p} /></>}
      {key === 'seth' && (
        <>
          <Path d="M1 3h15v13H1z" {...p} />
          <Path d="M16 8h4l3 3v5h-7V8z" {...p} />
          <Circle cx="5.5" cy="18.5" r="2.5" {...p} />
          <Circle cx="18.5" cy="18.5" r="2.5" {...p} />
        </>
      )}
      {key === 'khata' && <><Path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" {...p} /><Path d="M18 17H6" {...p} /></>}
      {key === 'report' && <Path d="M5 20V10M12 20V4M19 20v-7" {...p} />}
    </Svg>
  );
};

const TABS: [TabKey, string, string, string][] = [
  ['index', 'Home', 'होम', '/'],
  ['sale', 'Sale', 'बिक्री', '/sale'],
  ['inventory', 'Stock', 'स्टॉक', '/inventory'],
  ['seth', 'Seth Khata', 'सेठ खाता', '/seth'],
  ['khata', 'Khata', 'खाता', '/khata'],
  ['report', 'Report', 'रिपोर्ट', '/report'],
];

function TabBar({ current }: { current: string }) {
  const insets = useSafeAreaInsets();
  const { lang } = useStore();
  const active = OWNER[current] ?? 'index';
  return (
    <View style={{ flexDirection: 'row', paddingTop: 8, paddingHorizontal: 10, paddingBottom: Math.max(insets.bottom, 10) + 6, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.divider }}>
      {TABS.map(([key, enLabel, hiLabel, href]) => {
        const on = key === active;
        const color = on ? C.a700 : C.n600;
        const label = lang === 'hi' ? hiLabel : enLabel;
        return (
          <Pressable
            key={key}
            onPress={() => router.navigate(href as never)}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 7, borderRadius: R.md, backgroundColor: on ? C.a200 : 'transparent' }}
          >
            {icon(key, color)}
            <Txt hi={lang === 'hi'} size={10} weight={600} color={color}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
      tabBar={(p) => <TabBar current={p.state.routes[p.state.index].name} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sale" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="seth" />
      <Tabs.Screen name="khata" />
      <Tabs.Screen name="report" />
      <Tabs.Screen name="bill/[id]" options={{ href: null }} />
      <Tabs.Screen name="arrivals" options={{ href: null }} />
      <Tabs.Screen name="rates" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="items" options={{ href: null }} />
    </Tabs>
  );
}
