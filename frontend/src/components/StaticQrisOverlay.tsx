import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  data: { qris_payload: string; merchant_name: string; merchant_id: string; location: string } | null;
};

// Full-screen overlay (no longer bottom sheet) — completely hides dashboard behind.
export default function StaticQrisOverlay({ visible, onClose, data }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} testID="static-qris-overlay">
        <View style={styles.headerBg} />
        <SafeAreaView edges={['top']} style={{ zIndex: 2 }}>
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>QRIS Statis</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="close-static-qris-btn">
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.body}>
          {!data ? (
            <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 60 }} />
          ) : (
            <View style={styles.card}>
              <Text style={styles.merchant}>{data.merchant_name}</Text>
              <Text style={styles.location}>{data.location}</Text>
              <View style={styles.qrWrap} testID="qris-static-code">
                <QRCode value={data.qris_payload} size={260} color={COLORS.textPrimary} backgroundColor="#fff" />
              </View>
              <View style={styles.midRow}>
                <Text style={styles.midLabel}>Merchant ID</Text>
                <Text style={styles.midValue}>{data.merchant_id}</Text>
              </View>
              <Text style={styles.hint}>Tunjukkan kode ini ke pelanggan untuk mereka pindai dan membayar.</Text>
              <TouchableOpacity style={styles.shareBtn} testID="share-btn" activeOpacity={0.85}>
                <Share2 color="#fff" size={18} strokeWidth={2.2} />
                <Text style={styles.shareText}>Bagikan QRIS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F2A26' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: COLORS.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 20, marginTop: 8 },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  merchant: { color: COLORS.primaryText, fontSize: 20, fontWeight: '800' },
  location: { color: COLORS.textSecondary, marginTop: 4 },
  qrWrap: { padding: 16, marginTop: 18, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: COLORS.cardBorder },
  midRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 18, padding: 12, backgroundColor: COLORS.bgLight, borderRadius: 12 },
  midLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  midValue: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  hint: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 12, paddingHorizontal: 8, lineHeight: 18 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, marginTop: 18 },
  shareText: { color: '#fff', fontWeight: '800' },
});
