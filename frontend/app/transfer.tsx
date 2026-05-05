import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Send, Wallet } from 'lucide-react-native';
import { COLORS } from '../src/theme';
import { api, Recipient } from '../src/api';

export default function Transfer() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.recentRecipients()
      .then((r) => setRecipients(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async () => {
    const amt = parseFloat(amount);
    if (!address.trim()) return Alert.alert('Validasi', 'Alamat wallet wajib diisi');
    if (!amt || amt <= 0) return Alert.alert('Validasi', 'Nominal harus lebih dari 0');
    setSubmitting(true);
    try {
      await api.transfer(address.trim(), amt, note.trim() || undefined);
      Alert.alert('Berhasil', `Transfer ${amt} USDT terkirim`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message ?? 'Coba lagi');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="transfer-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer / Tarik</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Penerima Terakhir</Text>
          <View style={styles.recipientsCard}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 16 }} />
            ) : recipients.length === 0 ? (
              <Text style={styles.empty}>Belum ada penerima</Text>
            ) : (
              recipients.slice(0, 5).map((r, i) => (
                <TouchableOpacity
                  key={r.address}
                  style={styles.recRow}
                  onPress={() => setAddress(r.address)}
                  testID={`recipient-${i}`}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <User color={COLORS.primary} size={20} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recName}>{r.name}</Text>
                    <Text style={styles.recAddr} numberOfLines={1}>{r.address}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Atau Input Manual</Text>
          <View style={styles.formCard}>
            <Text style={styles.label}>Alamat Wallet (TRC20)</Text>
            <TextInput
              style={styles.input}
              placeholder="TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={COLORS.textMuted}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              testID="address-input"
            />
            <Text style={styles.label}>Jumlah (USDT)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              testID="amount-input"
            />
            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Untuk apa transfer ini?"
              placeholderTextColor={COLORS.textMuted}
              value={note}
              onChangeText={setNote}
              testID="note-input"
            />
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={onSubmit}
              disabled={submitting}
              testID="submit-transfer-btn"
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Send color="#fff" size={18} strokeWidth={2.2} />
                  <Text style={styles.submitText}>Kirim Sekarang</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.hint}>
            <Wallet color={COLORS.primary} size={18} />
            <Text style={styles.hintText}>Transfer USDT TRC20 berhasil setelah konfirmasi blok jaringan Tron.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.primary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14, marginTop: 8, marginBottom: 8 },
  recipientsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recName: { color: COLORS.primaryText, fontWeight: '700' },
  recAddr: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 4 },
  label: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginTop: 18,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 4 },
  hintText: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  empty: { padding: 16, textAlign: 'center', color: COLORS.textSecondary },
});
