import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Send, Wallet } from 'lucide-react-native';
import { COLORS } from '../src/theme';
import { api, Recipient, VoiceIntent } from '../src/api';
import VoiceMicButton from '../src/components/VoiceMicButton';
import SuccessModal from '../src/components/SuccessModal';
import PinInputModal from '../src/components/PinInputModal';

export default function Transfer() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; address: string } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    api.recentRecipients()
      .then((r) => setRecipients(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.pinStatus().then((s) => setHasPin(s.is_set)).catch(() => {});
  }, []);

  // Handle URL params (from /scan-qris): prefill address & amount
  useEffect(() => {
    if (params.address && typeof params.address === 'string') {
      setAddress(params.address);
      if (params.amount && typeof params.amount === 'string') setAmount(params.amount);
      if (params.from === 'scan') setNote('Dari Scan QR / OCR');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.address, params.amount]);

  const onIntent = (intent: VoiceIntent, transcript: string) => {
    setVoiceTranscript(transcript);
    if (intent.action === 'withdraw') {
      Alert.alert(
        'Perintah Withdraw Terdeteksi',
        `"${transcript}"\n\nBuka halaman Withdraw?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka', onPress: () => router.replace('/withdraw') },
        ],
      );
      return;
    }
    if (intent.amount) setAmount(String(intent.amount));
    if (intent.recipient) {
      const match = recipients.find((r) => r.name.toLowerCase().includes(intent.recipient!.toLowerCase()));
      if (match) setAddress(match.address);
      else setAddress('');
    }
    if (!intent.amount && !intent.recipient) {
      Alert.alert('Tidak terdeteksi', `Tidak bisa mem-parse perintah:\n"${transcript}"`);
    }
  };

  const onSubmit = async () => {
    const amt = parseFloat(amount);
    if (!address.trim()) return Alert.alert('Validasi', 'Alamat wallet wajib diisi');
    if (!amt || amt <= 0) return Alert.alert('Validasi', 'Nominal harus lebih dari 0');
    if (hasPin) { setPinPromptOpen(true); return; }
    if (!hasPin) {
      Alert.alert(
        'PIN Belum Diatur',
        'Untuk keamanan, silakan buat PIN transaksi terlebih dahulu di Settings.',
        [
          { text: 'Lewati Sementara', onPress: () => doTransfer(amt) },
          { text: 'Buat PIN', onPress: () => router.push('/setup-pin') },
        ],
      );
    }
  };

  const doTransfer = async (amt: number) => {
    setSubmitting(true);
    try {
      await api.transfer(address.trim(), amt, note.trim() || undefined);
      setSuccess({ amount: amt, address: address.trim() });
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
        <Text style={styles.headerTitle}>Transfer USDT</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {/* Voice command */}
          <View style={styles.voiceCard} testID="voice-card">
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceTitle}>Perintah Suara</Text>
              <Text style={styles.voiceSub}>
                Contoh: &quot;Transfer 50 USDT ke Andi&quot; — kami otomatis isi formnya.
              </Text>
              {voiceTranscript ? (
                <Text style={styles.transcript} numberOfLines={2}>🎤 {voiceTranscript}</Text>
              ) : null}
            </View>
            <VoiceMicButton onIntent={onIntent} testID="transfer-mic-btn" />
          </View>

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
                  style={[styles.recRow, address === r.address && styles.recRowActive]}
                  onPress={() => setAddress(r.address)}
                  testID={`recipient-${i}`}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}><User color={COLORS.primary} size={20} strokeWidth={2} /></View>
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
            <Text style={styles.hintText}>Transfer USDT TRC20. Dana sampai setelah konfirmasi blok jaringan Tron.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={!!success}
        title="Transfer Berhasil"
        amount={success ? `${success.amount} USDT` : ''}
        message={success ? `Terkirim ke\n${success.address.slice(0, 12)}…${success.address.slice(-4)}` : ''}
        onClose={() => { setSuccess(null); router.back(); }}
        testID="transfer-success-modal"
      />

      <PinInputModal
        visible={pinPromptOpen}
        title="PIN Transaksi"
        subtitle={`Konfirmasi transfer ${parseFloat(amount) || 0} USDT`}
        onClose={() => setPinPromptOpen(false)}
        onSuccess={() => { setPinPromptOpen(false); doTransfer(parseFloat(amount)); }}
        testID="transfer-pin-modal"
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
  sectionTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14, marginTop: 8, marginBottom: 8 },
  recipientsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
  recRowActive: { backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.primary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recName: { color: COLORS.primaryText, fontWeight: '700' },
  recAddr: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 4 },
  label: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginTop: 18 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 4 },
  hintText: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  empty: { padding: 16, textAlign: 'center', color: COLORS.textSecondary },
});
