import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Shield, HelpCircle, LogOut, Globe, Wallet, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../src/theme';

const ITEMS: { icon: any; label: string; sub?: string }[] = [
  { icon: Wallet, label: 'Dompet & Alamat', sub: 'Kelola wallet USDT (TRC20)' },
  { icon: Bell, label: 'Notifikasi', sub: 'Push, email, transaksi' },
  { icon: Shield, label: 'Keamanan', sub: 'PIN, biometrik, sesi' },
  { icon: Globe, label: 'Bahasa & Mata Uang', sub: 'Indonesia · IDR' },
  { icon: HelpCircle, label: 'Bantuan & FAQ' },
];

export default function Settings() {
  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="settings-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>Atur profil & preferensi PAYO</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.card}>
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <TouchableOpacity
                key={i}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => { if (it.onPressKey === 'pin') router.push('/setup-pin'); }}
                testID={`settings-row-${i}`}
              >
                <View style={styles.iconWrap}>
                  <Icon color={COLORS.primary} size={20} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{it.label}</Text>
                  {it.sub && <Text style={styles.subText}>{it.sub}</Text>}
                </View>
                <ChevronRight color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.logout} testID="logout-btn">
          <LogOut color={COLORS.danger} size={18} />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  sub: { color: COLORS.textSecondary, marginTop: 4 },
  card: {
    marginHorizontal: 20, padding: 8,
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  subText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  logout: {
    marginTop: 24, marginHorizontal: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.divider,
    paddingVertical: 14, borderRadius: 14,
  },
  logoutText: { color: COLORS.danger, fontWeight: '700' },
});
