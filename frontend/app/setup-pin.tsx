import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Delete, KeyRound } from 'lucide-react-native';
import { COLORS } from '../src/theme';
import { api } from '../src/api';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export default function SetupPin() {
  const router = useRouter();
  const [step, setStep] = useState<'enter' | 'confirm' | 'done'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [shake] = useState(new Animated.Value(0));

  useEffect(() => {
    api.pinStatus().then((s) => setHasExistingPin(s.is_set)).catch(() => {});
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const current = step === 'enter' ? pin : confirmPin;
  const setCurrent = step === 'enter' ? setPin : setConfirmPin;

  const onPress = async (k: string) => {
    if (submitting) return;
    if (k === 'back') return setCurrent(current.slice(0, -1));
    if (!k) return;
    if (current.length >= 6) return;
    const next = current + k;
    setCurrent(next);
    if (next.length === 6) {
      if (step === 'enter') {
        setStep('confirm');
      } else {
        if (next !== pin) {
          triggerShake();
          Alert.alert('PIN Tidak Cocok', 'Konfirmasi PIN tidak sama dengan PIN yang Anda buat. Coba lagi.');
          setConfirmPin('');
          setPin('');
          setStep('enter');
          return;
        }
        setSubmitting(true);
        try {
          await api.pinCreate(pin, next);
          setStep('done');
        } catch (e: any) {
          Alert.alert('Gagal', e?.message ?? 'Coba lagi');
          setPin(''); setConfirmPin(''); setStep('enter');
        } finally { setSubmitting(false); }
      }
    }
  };

  if (step === 'done') {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="setup-pin-screen">
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}><ShieldCheck color="#fff" size={48} strokeWidth={2.2} /></View>
          <Text style={styles.doneTitle}>PIN Berhasil Dibuat</Text>
          <Text style={styles.doneSub}>PIN Anda akan diminta saat melakukan transfer, withdraw, atau konfirmasi pembayaran QRIS.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} testID="done-btn">
            <Text style={styles.doneBtnText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="setup-pin-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{hasExistingPin ? 'Ubah PIN' : 'Buat PIN'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}><KeyRound color={COLORS.primary} size={32} strokeWidth={2.2} /></View>
        <Text style={styles.title}>{step === 'enter' ? 'Buat PIN 6 Digit' : 'Konfirmasi PIN'}</Text>
        <Text style={styles.sub}>
          {step === 'enter'
            ? 'PIN ini melindungi setiap transaksi (transfer, withdraw, scan QRIS).'
            : 'Masukkan PIN sekali lagi untuk konfirmasi.'}
        </Text>

        <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, i < current.length && styles.dotFilled]} testID={`setup-dot-${i}`} />
          ))}
        </Animated.View>

        {submitting ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.keypad}>
            {KEYS.map((k, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.key, !k && styles.keyEmpty]}
                onPress={() => onPress(k)}
                disabled={!k}
                testID={k === 'back' ? 'setup-key-back' : k ? `setup-key-${k}` : undefined}
                activeOpacity={0.7}
              >
                {k === 'back' ? <Delete color={COLORS.primary} size={22} strokeWidth={2} /> : <Text style={styles.keyText}>{k}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.security}>🔒 PIN disimpan dengan one-way hashing (bcrypt) di server. Maksimal 5 percobaan, setelah itu akun terkunci 15 menit.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.primary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.bgWhite, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderWidth: 1, borderColor: COLORS.cardBorder },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16 },
  sub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 12 },
  dots: { flexDirection: 'row', gap: 14, marginTop: 28 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.cardBorder, backgroundColor: '#fff' },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 28, width: 280 },
  key: { width: 78, height: 64, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorderSoft, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  keyText: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  security: { color: COLORS.textSecondary, fontSize: 11, marginTop: 24, textAlign: 'center', paddingHorizontal: 16, lineHeight: 16 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  doneSub: { color: COLORS.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 22 },
  doneBtn: { marginTop: 28, backgroundColor: COLORS.primary, paddingHorizontal: 48, paddingVertical: 14, borderRadius: 14 },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
