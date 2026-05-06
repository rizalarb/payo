import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building2, ArrowDownToLine, Check } from 'lucide-react-native';
import { COLORS } from '../src/theme';
import { api, Bank, VoiceIntent, WithdrawResult } from '../src/api';
import VoiceMicButton from '../src/components/VoiceMicButton';
import SuccessModal from '../src/components/SuccessModal';

const QUICK = [100000, 250000, 500000, 1000000];

export default function Withdraw() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WithdrawResult | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);

  useEffect(() => {
    api.banks().then((r) => setBanks(r.items)).catch(() => {});
  }, []);

  const onIntent = (intent: VoiceIntent, transcript: string) => {
    setVoiceTranscript(transcript);
    if (intent.action === 'transfer') {
      Alert.alert('Perintah Transfer Terdeteksi', `"${transcript}"\n\nBuka halaman Transfer?`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka', onPress: () => router.replace('/transfer') },
      ]);
      return;
    }
    if (intent.amount) setAmount(String(Math.round(intent.amount)));
    if (intent.bank) setBankCode(intent.bank);
    if (intent.account_number) setAccountNumber(intent.account_number);
  };

  const onSubmit = async () => {
    const amt = parseFloat(amount);
    if (!bankCode) return Alert.alert('Validasi', 'Pilih bank tujuan');
    if (!accountNumber.trim()) return Alert.alert('Validasi', 'Masukkan nomor rekening');
    if (!accountHolder.trim()) return Alert.alert('Validasi', 'Masukkan nama pemilik rekening');
    if (!amt || amt < 50000) return Alert.alert('Validasi', 'Minimum withdraw Rp50.000');
    setSubmitting(true);
    try {
      const res = await api.withdraw(bankCode, accountNumber.trim(), accountHolder.trim(), amt, note.trim() || undefined);
      setResult(res);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message ?? 'Coba lagi');
    } finally { setSubmitting(false); }
  };

  const fmtIDR = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="withdraw-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tarik Saldo ke Bank</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Voice command */}
          <View style={styles.voiceCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceTitle}>Perintah Suara</Text>
              <Text style={styles.voiceSub}>Contoh: &quot;Tarik 500 ribu ke BCA&quot;</Text>
              {voiceTranscript ? <Text style={styles.transcript} numberOfLines={2}>🎤 {voiceTranscript}</Text> : null}
            </View>
            <VoiceMicButton onIntent={onIntent} testID="withdraw-mic-btn" />
          </View>

          <Text style={styles.sectionTitle}>Pilih Bank Tujuan</Text>
          <View style={styles.bankGrid}>
            {banks.map((b) => (
              <TouchableOpacity
                key={b.code}
                style={[styles.bankBtn, bankCode === b.code && styles.bankBtnActive]}
                onPress={() => setBankCode(b.code)}
                testID={`bank-${b.code}`}
                activeOpacity={0.85}
              >
                <Building2 color={bankCode === b.code ? '#fff' : COLORS.primary} size={18} strokeWidth={2} />
                <Text style={[styles.bankBtnText, bankCode === b.code && { color: '#fff' }]}>{b.code}</Text>
                {bankCode === b.code && <Check color="#fff" size={16} strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Nomor Rekening</Text>
            <TextInput
              style={styles.input}
              placeholder="1234567890"
              placeholderTextColor={COLORS.textMuted}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              testID="account-number-input"
            />
            <Text style={styles.label}>Nama Pemilik</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama sesuai rekening"
              placeholderTextColor={COLORS.textMuted}
              value={accountHolder}
              onChangeText={setAccountHolder}
              autoCapitalize="words"
              testID="account-holder-input"
            />
            <Text style={styles.label}>Jumlah (Rp)</Text>
            <TextInput
              style={styles.input}
              placeholder="500000"
              placeholderTextColor={COLORS.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              testID="amount-input"
            />
            <View style={styles.quickRow}>
              {QUICK.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickChip}
                  onPress={() => setAmount(String(q))}
                  testID={`quick-${q}`}
                >
                  <Text style={styles.quickText}>{fmtIDR(q)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Untuk apa pencairan ini?"
              placeholderTextColor={COLORS.textMuted}
              value={note}
              onChangeText={setNote}
              testID="note-input"
            />

            {amount && parseFloat(amount) >= 50000 && (
              <View style={styles.feeBox}>
                <Text style={styles.feeLine}>Jumlah: <Text style={styles.feeBold}>{fmtIDR(parseFloat(amount))}</Text></Text>
                <Text style={styles.feeLine}>Biaya admin (0,5%): <Text style={styles.feeBold}>-{fmtIDR(parseFloat(amount) * 0.005)}</Text></Text>
                <View style={styles.feeDivider} />
                <Text style={styles.feeLine}>Diterima: <Text style={[styles.feeBold, { color: COLORS.primaryText }]}>{fmtIDR(parseFloat(amount) - parseFloat(amount) * 0.005)}</Text></Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={onSubmit}
              disabled={submitting}
              testID="submit-withdraw-btn"
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <ArrowDownToLine color="#fff" size={18} strokeWidth={2.2} />
                  <Text style={styles.submitText}>Cairkan Sekarang</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={!!result}
        title="Pencairan Berhasil"
        message={result ? `${fmtIDR(result.net_idr)} akan masuk ke rekening ${result.transaction.counterparty}.\nEstimasi: ${result.estimated_arrival}` : ''}
        onClose={() => { setResult(null); router.back(); }}
        testID="withdraw-success-modal"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.primary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  voiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 16,
    shadowColor: COLORS.primary, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3,
    borderWidth: 1, borderColor: COLORS.cardBorderSoft,
  },
  voiceTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 14 },
  voiceSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  transcript: { color: COLORS.primaryText, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14, marginTop: 4, marginBottom: 8 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  bankBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#fff',
  },
  bankBtnActive: { backgroundColor: COLORS.primary },
  bankBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  label: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.cardBorder },
  quickText: { color: COLORS.primaryText, fontSize: 12, fontWeight: '700' },
  feeBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.cardBorderSoft },
  feeLine: { color: COLORS.textSecondary, fontSize: 13, marginVertical: 2 },
  feeBold: { color: COLORS.textPrimary, fontWeight: '800' },
  feeDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 6 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
