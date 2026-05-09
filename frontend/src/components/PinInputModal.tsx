import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { ShieldCheck, Delete, X } from 'lucide-react-native';
import { COLORS } from '../theme';
import { api } from '../api';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSuccess: () => void;
  testID?: string;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export default function PinInputModal({ visible, title = 'Masukkan PIN', subtitle = 'PIN diperlukan untuk konfirmasi pembayaran', onClose, onSuccess, testID }: Props) {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) { setPin(''); setError(null); setVerifying(false); }
  }, [visible]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onPress = async (k: string) => {
    if (verifying) return;
    setError(null);
    if (k === 'back') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!k) return;
    if (pin.length >= 6) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 6) {
      setVerifying(true);
      try {
        await api.pinVerify(next);
        onSuccess();
      } catch (e: any) {
        triggerShake();
        setError(e?.message?.replace(/^HTTP \d+: /, '').replace(/^\{.*"detail":"/, '').replace(/"\}$/, '') || 'PIN salah');
        setPin('');
      } finally { setVerifying(false); }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop} testID={testID}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} testID="pin-close-btn">
            <X color={COLORS.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.shieldWrap}>
            <ShieldCheck color={COLORS.primary} size={32} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>

          <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled, error && styles.dotError]} testID={`pin-dot-${i}`} />
            ))}
          </Animated.View>

          {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 18 }} />}

          {verifying ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.keypad}>
              {KEYS.map((k, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.key, !k && styles.keyEmpty]}
                  onPress={() => onPress(k)}
                  disabled={!k}
                  testID={k === 'back' ? 'pin-key-back' : k ? `pin-key-${k}` : undefined}
                  activeOpacity={0.7}
                >
                  {k === 'back' ? <Delete color={COLORS.primary} size={22} strokeWidth={2} /> : <Text style={styles.keyText}>{k}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,42,38,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8 },
  shieldWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 },
  sub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 12 },
  dots: { flexDirection: 'row', gap: 12, marginTop: 20 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.cardBorder, backgroundColor: '#fff' },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dotError: { borderColor: COLORS.danger },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 8, fontWeight: '600' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 18, width: 264 },
  key: { width: 72, height: 60, borderRadius: 14, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorderSoft },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
});
