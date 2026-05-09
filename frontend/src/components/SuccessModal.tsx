import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { Check, X, Sparkles } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle as SvgCircle } from 'react-native-svg';
import { COLORS } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  amount?: string;
  onClose: () => void;
  autoDismissMs?: number;
  testID?: string;
};

const CONFETTI_COUNT = 18;
const CONFETTI_COLORS = ['#2EBFA5', '#56D6BA', '#F5A623', '#FFD86B', '#3DB7FF', '#E5A6FF'];

function ConfettiPiece({ index, trigger }: { index: number; trigger: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const startX = (index / CONFETTI_COUNT) * SCREEN_W;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + (index % 4) * 2;
  const delay = (index % 6) * 80;

  useEffect(() => {
    fall.setValue(0); sway.setValue(0); rotate.setValue(0);
    Animated.parallel([
      Animated.timing(fall, { toValue: 1, duration: 2400 + (index % 5) * 200, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.loop(Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 700, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })),
    ]).start();
  }, [trigger, fall, sway, rotate, delay, index]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-40, 720] });
  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-18, 18] });
  const rotateZ = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, left: startX,
        width: size, height: size, borderRadius: index % 2 ? size / 2 : 1,
        backgroundColor: color, opacity,
        transform: [{ translateY }, { translateX }, { rotateZ }],
      }}
    />
  );
}

export default function SuccessModal({ visible, title, message, amount, onClose, autoDismissMs, testID }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.4)).current;
  const checkBounce = useRef(new Animated.Value(0)).current;
  const trigger = useRef(0);

  useEffect(() => {
    if (visible) {
      trigger.current += 1;
      scale.setValue(0); opacity.setValue(0); ringScale.setValue(0.4); checkBounce.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.loop(Animated.timing(ringScale, { toValue: 1.6, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true })),
        Animated.spring(checkBounce, { toValue: 1, friction: 4, tension: 120, delay: 200, useNativeDriver: true }),
      ]).start();
      if (autoDismissMs) {
        const t = setTimeout(onClose, autoDismissMs);
        return () => clearTimeout(t);
      }
    }
  }, [visible, autoDismissMs, onClose, scale, opacity, ringScale, checkBounce]);

  const checkScale = checkBounce.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ringOpacity = ringScale.interpolate({ inputRange: [0.4, 1, 1.6], outputRange: [0.35, 0.18, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Animated SVG gradient backdrop */}
      <View style={styles.backdrop} testID={testID}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0F2A26" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#1FA68C" stopOpacity="0.55" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
          {/* decorative blurred orbs */}
          <SvgCircle cx={SCREEN_W * 0.15} cy="120" r="120" fill={COLORS.primary} opacity="0.18" />
          <SvgCircle cx={SCREEN_W * 0.85} cy="500" r="160" fill="#56D6BA" opacity="0.15" />
        </Svg>

        {/* Confetti */}
        {visible && Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
          <ConfettiPiece key={i} index={i} trigger={trigger.current} />
        ))}

        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} testID="success-close-btn">
            <X color={COLORS.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={styles.iconStage}>
            <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            <View style={styles.checkOuter}>
              <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
                <Check color="#fff" size={42} strokeWidth={3.4} />
              </Animated.View>
            </View>
            <Sparkles color={COLORS.primary} size={18} style={{ position: 'absolute', top: 6, right: 8 }} />
            <Sparkles color="#56D6BA" size={14} style={{ position: 'absolute', bottom: 10, left: 4 }} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {amount ? <Text style={styles.amount}>{amount}</Text> : null}
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
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 28,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 18 }, elevation: 18,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8 },
  iconStage: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.primary },
  checkOuter: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  checkCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginTop: 4 },
  amount: { fontSize: 28, fontWeight: '900', color: COLORS.primaryText, textAlign: 'center', marginTop: 10, letterSpacing: -0.5 },
  message: { color: COLORS.textSecondary, marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  okBtn: {
    marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 48, paddingVertical: 14, borderRadius: 14,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  okText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
