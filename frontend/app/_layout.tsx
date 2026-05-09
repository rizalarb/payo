import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5FFFB' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="all-transactions" options={{ presentation: 'card' }} />
        <Stack.Screen name="transfer" options={{ presentation: 'card' }} />
        <Stack.Screen name="withdraw" options={{ presentation: 'card' }} />
        <Stack.Screen name="input-manual" options={{ presentation: 'card' }} />
        <Stack.Screen name="scan-qris" options={{ presentation: 'card' }} />
        <Stack.Screen name="scan-receipt" options={{ presentation: 'card' }} />
        <Stack.Screen name="setup-pin" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
