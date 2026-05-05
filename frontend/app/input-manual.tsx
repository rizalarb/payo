import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, RefreshCcw } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../src/theme';
import { api } from '../src/api';

export default function InputManual() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState<'IDR' | 'USDT'>('IDR');
  const [qris, setQris] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return Alert.alert('Validasi', 'Masukkan nominal yang valid');
    setLoading(true);
    try {
      const res = await api.generateQris(amt, currency, note.trim() || undefined);
      setQris(res.qris_payload);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message ?? 'Coba lagi');
    } finally { setLoading(false); }
  };

  const reset = () => { setQris(null); setAmount(''); setNote(''); };

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="input-manual-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QRIS Dinamis</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {!qris ? (
            <View style={styles.card}>
              <Text style={styles.title}>Buat QRIS Pembayaran</Text>
              <Text style={styles.sub}>Masukkan nominal yang akan ditagihkan. QRIS akan kedaluwarsa dalam 15 menit.</Text>

              <View style={styles.currencyRow}>
                {(['IDR', 'USDT'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                    onPress={() => setCurrency(c)}
                    testID={`currency-${c}`}
                  >
                    <Text style={[styles.currencyText, currency === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Nominal</Text>
              <TextInput
                style={styles.input}
                placeholder={currency === 'IDR' ? '0' : '0.00'}
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                testID="amount-input"
              />

              <Text style={styles.label}>Catatan (opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Tiket, F&B, dsb."
                placeholderTextColor={COLORS.textMuted}
                value={note}
                onChangeText={setNote}
                testID="note-input"
              />

              <TouchableOpacity
                style={[styles.generateBtn, loading && { opacity: 0.7 }]}
                onPress={generate}
                disabled={loading}
                testID="generate-qris-btn"
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Sparkles color="#fff" size={18} strokeWidth={2.2} />
                    <Text style={styles.generateText}>Generate QRIS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.title}>Tagihan {currency === 'IDR' ? 'Rp' : ''}{Number(amount).toLocaleString('id-ID')} {currency !== 'IDR' ? currency : ''}</Text>
              {note ? <Text style={styles.sub}>{note}</Text> : null}
              <View style={styles.qrWrap} testID="qris-output">
                <QRCode value={qris} size={240} color={COLORS.textPrimary} backgroundColor="#fff" />
              </View>
              <Text style={styles.merchantName}>Milea Concert</Text>
              <Text style={styles.merchantSub}>Cengkareng, Jakarta Barat · Berlaku 15 menit</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={reset} testID="reset-btn" activeOpacity={0.8}>
                <RefreshCcw color={COLORS.primary} size={18} />
                <Text style={styles.resetText}>Buat QRIS Baru</Text>
              </TouchableOpacity>
            </View>
          )}
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
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  sub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  currencyRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  currencyBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.cardBorder, alignItems: 'center',
  },
  currencyBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currencyText: { color: COLORS.primary, fontWeight: '700' },
  label: { color: COLORS.textSecondary, fontSize: 12, marginTop: 14, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14,
  },
  generateBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginTop: 20,
  },
  generateText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  qrWrap: { alignSelf: 'center', padding: 16, marginTop: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.cardBorder },
  merchantName: { textAlign: 'center', marginTop: 14, fontWeight: '800', color: COLORS.textPrimary, fontSize: 16 },
  merchantSub: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 12 },
  resetText: { color: COLORS.primary, fontWeight: '700' },
});
