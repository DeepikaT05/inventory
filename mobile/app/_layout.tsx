import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari';
import { StoreProvider, useStore } from '../src/store';
import { Btn, Toast, Txt } from '../src/ui';
import { API_URL } from '../src/api';
import { C } from '../src/theme';

function Gate() {
  const { shop, loadError, refresh } = useStore();
  const segments = useSegments();
  const onSetup = segments[0] === 'setup';

  useEffect(() => {
    if (shop === null && !onSetup) router.replace('/setup');
  }, [shop, onSetup]);

  if (shop === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        {loadError ? (
          <>
            <Txt heading size={22} style={{ textAlign: 'center' }}>Can't reach the ledger</Txt>
            <Txt size={13} color={C.n700} style={{ textAlign: 'center', marginTop: 8 }}>
              {loadError}{'\n'}Server: {API_URL}
            </Txt>
            <Btn label="Try again" onPress={refresh} style={{ marginTop: 16 }} />
          </>
        ) : <ActivityIndicator color={C.accent} />}
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Caprasimo_400Regular, Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold,
    NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Gate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
