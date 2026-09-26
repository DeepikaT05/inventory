import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C, F, R, shadow } from './theme';
import { longDate } from './format';
import { useStore } from './store';

// ── Text ──────────────────────────────────────────────────────────────────

type TxtProps = TextProps & {
  size?: number; color?: string; heading?: boolean; hi?: boolean; weight?: 400 | 600 | 700;
  style?: StyleProp<TextStyle>;
};

export function Txt({ size = 14, color = C.text, heading, hi, weight = 400, style, ...rest }: TxtProps) {
  const fontFamily = heading ? F.heading : hi ? (weight >= 600 ? F.hiSemi : F.hi) : weight === 700 ? F.bold : weight === 600 ? F.semi : F.body;
  return <Text {...rest} style={[{ fontFamily, fontSize: size, color }, style]} />;
}

/** Small uppercase label, e.g. "PAYMENT" or "भुगतान". */
export function Kicker({ en, hi, color = C.n700, style }: { en: string; hi?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  const { lang } = useStore();
  const text = lang === 'hi' && hi ? hi : en;
  const isHi = lang === 'hi' && Boolean(hi);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }, style]}>
      <Txt hi={isHi} size={11} color={color} style={{ letterSpacing: isHi ? 0.3 : 0.9, textTransform: isHi ? 'none' : 'uppercase' }}>{text}</Txt>
    </View>
  );
}

export function SectionTitle({ en, hi, right }: { en: string; hi?: string; right?: ReactNode }) {
  const { lang } = useStore();
  const text = lang === 'hi' && hi ? hi : en;
  const isHi = lang === 'hi' && Boolean(hi);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
      <Txt heading={!isHi} hi={isHi} size={17} weight={isHi ? 600 : undefined}>
        {text}
      </Txt>
      {right}
    </View>
  );
}

// ── Screen shell: header (title + language filter + date + shop name) and scrolling body ─────

export function Screen({ en, hi, children, scroll = true, overlay }: {
  en: string; hi?: string; children: ReactNode; scroll?: boolean; overlay?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { shop, lang, setLang } = useStore();
  const title = lang === 'hi' && hi ? hi : en;
  const isHi = lang === 'hi' && Boolean(hi);
  const Body = scroll ? ScrollView : View;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        {/* Meta row: Shop info on left, Language switcher on right */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            onPress={() => router.navigate('/settings')}
          >
            {Boolean(shop?.name) && (
              <>
                <Txt heading size={14} color={C.a700} numberOfLines={1} style={{ maxWidth: '65%' }}>
                  {shop?.name}
                </Txt>
                <Txt size={10} color={C.n500}>•</Txt>
              </>
            )}
            <Txt size={10} color={C.n600} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {longDate(new Date())}
            </Txt>
          </Pressable>

          {/* Language filter switcher */}
          <Pressable
            onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}
            accessibilityLabel="Switch language"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(32,30,29,0.07)',
              borderRadius: R.pill,
              padding: 2.5,
              borderWidth: 1,
              borderColor: 'rgba(32,30,29,0.12)',
            }}
          >
            <View style={{
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: R.pill,
              backgroundColor: lang === 'en' ? C.accent : 'transparent',
            }}>
              <Txt size={10} weight={700} color={lang === 'en' ? C.white : C.n700}>EN</Txt>
            </View>
            <View style={{
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: R.pill,
              backgroundColor: lang === 'hi' ? C.accent : 'transparent',
            }}>
              <Txt hi size={10} weight={700} color={lang === 'hi' ? C.white : C.n700}>हिं</Txt>
            </View>
          </Pressable>
        </View>

        {/* Title row: Full width, proper line height and vertical padding to prevent clipping */}
        <View style={{ marginTop: 6, paddingVertical: 2 }}>
          <Txt
            heading={!isHi}
            hi={isHi}
            size={25}
            weight={isHi ? 700 : undefined}
            style={{ lineHeight: isHi ? 34 : 33, paddingVertical: 1 }}
          >
            {title}
          </Txt>
        </View>
      </View>
      <Body
        style={{ flex: 1 }}
        {...(scroll ? { contentContainerStyle: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 24 }, keyboardShouldPersistTaps: 'handled' as const, showsVerticalScrollIndicator: false } : {})}
      >
        {scroll ? children : <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 4 }}>{children}</View>}
      </Body>
      {overlay}
    </View>
  );
}

// ── Buttons & chips ───────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'sage' | 'plain';

const btnBg: Record<BtnVariant, [string, string]> = {
  primary: [C.accent, C.a600],
  sage: [C.g600, C.g700],
  secondary: ['transparent', 'rgba(32,30,29,0.07)'],
  ghost: ['transparent', 'rgba(198,113,57,0.10)'],
  plain: ['transparent', 'rgba(32,30,29,0.05)'],
};

export function Btn({ label, onPress, variant = 'primary', style, textStyle, children, disabled, size = 14, block }: {
  label?: ReactNode; onPress?: () => void; variant?: BtnVariant; style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>; children?: ReactNode; disabled?: boolean; size?: number; block?: boolean;
}) {
  const fg = variant === 'primary' ? C.bg : variant === 'sage' ? C.white : variant === 'ghost' ? C.accent : C.text;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: btnBg[variant][pressed ? 1 : 0], opacity: disabled ? 0.45 : 1 },
        variant === 'secondary' && { borderColor: C.divider },
        variant === 'ghost' && { paddingHorizontal: 4 },
        block && { alignSelf: 'stretch', marginTop: 9 },
        style,
      ]}
    >
      {children ?? <Txt heading size={size} color={fg} style={textStyle}>{label}</Txt>}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, style, onColor = C.accent }: {
  label: string; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; onColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: on ? onColor : pressed ? C.n200 : C.n100 },
        style,
      ]}
    >
      <Txt size={12.5} color={on ? C.white : C.text} numberOfLines={1}>{label}</Txt>
    </Pressable>
  );
}

export function RoundBtn({ label, onPress, primary, size = 34 }: { label: string; onPress: () => void; primary?: boolean; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [{
        width: size, height: size, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center',
        backgroundColor: primary ? (pressed ? C.a600 : C.accent) : pressed ? 'rgba(32,30,29,0.07)' : 'transparent',
        borderWidth: primary ? 0 : 1, borderColor: C.divider,
      }]}
    >
      <Txt heading size={18} color={primary ? C.bg : C.text} style={{ lineHeight: 22 }}>{label}</Txt>
    </Pressable>
  );
}

export function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 50, height: 30, borderRadius: R.pill, padding: 3, flexDirection: 'row', justifyContent: on ? 'flex-end' : 'flex-start', backgroundColor: on ? C.g600 : C.n400 }}
    >
      <View style={[{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.white }, shadow.sm]} />
    </Pressable>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────

export const Pill = ({ color, w = 10, h = 26 }: { color: string; w?: number; h?: number }) => (
  <View style={{ width: w, height: h, borderRadius: R.pill, backgroundColor: color }} />
);

export const Avatar = ({ text, bg = C.a200, fg = C.a800, size = 34 }: { text: string; bg?: string; fg?: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Txt size={12.5} weight={700} color={fg}>{text}</Txt>
  </View>
);

export function Card({ children, style, tone = 'light' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'light' | 'surface' }) {
  return (
    <View style={[
      { borderRadius: R.md, padding: 13 },
      tone === 'light' ? { backgroundColor: C.n100, borderWidth: 1, borderColor: C.divider } : { backgroundColor: C.surface },
      style,
    ]}>{children}</View>
  );
}

export function Empty({ en, hi, action, onAction }: { en: string; hi?: string; action?: string; onAction?: () => void }) {
  const { lang } = useStore();
  const text = lang === 'hi' && hi ? hi : en;
  const isHi = lang === 'hi' && Boolean(hi);
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: C.n400, borderRadius: R.md, padding: 22, alignItems: 'center', marginTop: 12 }}>
      <Txt hi={isHi} size={13} color={C.n700} style={{ textAlign: 'center' }}>{text}</Txt>
      {action ? <Btn variant="ghost" label={action} onPress={onAction} style={{ marginTop: 6 }} /> : null}
    </View>
  );
}

export function Field({ label, style, ...input }: React.ComponentProps<typeof TextInput> & { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      <Txt size={12} color={C.n700} style={{ marginBottom: 5 }}>{label}</Txt>
      <TextInput
        placeholderTextColor={C.n500}
        selectionColor={C.accent}
        {...input}
        style={{ minHeight: 42, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider, fontFamily: F.body, fontSize: 15, color: C.text }}
      />
    </View>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────────────────

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const y = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    if (visible) { y.setValue(600); Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start(); }
  }, [visible, y]);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: C.backdrop }]} onPress={onClose} />
        <Animated.View style={[s.sheet, shadow.lg, { paddingBottom: insets.bottom + 20, transform: [{ translateY: y }] }]}>
          <View style={s.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** One-field sheet for adding a name (customer, dealer). */
export function NameSheet({ visible, title, onClose, onSubmit, value, setValue }: {
  visible: boolean; title: string; onClose: () => void; onSubmit: () => void; value: string; setValue: (v: string) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt heading size={20} style={{ marginBottom: 12 }}>{title}</Txt>
      <Field label="Name" value={value} onChangeText={setValue} autoFocus returnKeyType="done" onSubmitEditing={onSubmit} />
      <Btn block label="Save" onPress={onSubmit} disabled={!value.trim()} style={{ paddingVertical: 14, borderRadius: R.pill }} size={16} />
    </Sheet>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[s.toast, shadow.lg]}>
      <Txt size={13} color={C.a100} style={{ textAlign: 'center' }}>{toast}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 8, backgroundColor: C.bg },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: 'transparent' },
  chip: { borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: C.divider, alignItems: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: 18, paddingTop: 16 },
  grabber: { width: 44, height: 4, borderRadius: R.pill, backgroundColor: C.n400, alignSelf: 'center', marginBottom: 12 },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 110, zIndex: 90, backgroundColor: C.a900, borderRadius: R.pill, paddingVertical: 11, paddingHorizontal: 18 },
});
