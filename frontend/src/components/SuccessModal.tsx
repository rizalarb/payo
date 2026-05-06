import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { COLORS } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  autoDismissMs?: number;
  testID?: string;
};

export default function SuccessModal({ visible, title, message, onClose, autoDismissMs, testID }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0); opacity.setValue(0); ringScale.setValue(0.4);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.2, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      if (autoDismissMs) {
        const t = setTimeout(onClose, autoDismissMs);
        return () => clearTimeout(t);
      }
    }
  }, [visible, autoDismissMs, onClose, scale, opacity, ringScale]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop} testID={testID}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} testID="success-close-btn">
            <X color={COLORS.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.iconStage}>
            <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }] }]} />
            <View style={styles.checkCircle}>
              <Check color="#fff" size={36} strokeWidth={3.2} />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TouchableOpacity style={styles.okBtn} onPress={onClose} testID="success-ok-btn" activeOpacity={0.85}>
            <Text style={styles.okText}>Selesai</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,42,38,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 24,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8 },
  iconStage: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.primary, opacity: 0.18 },
  checkCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginTop: 4 },
  message: { color: COLORS.textSecondary, marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  okBtn: { marginTop: 22, backgroundColor: COLORS.primary, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 12,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  okText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
