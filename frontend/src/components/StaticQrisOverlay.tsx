import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  data: { qris_payload: string; merchant_name: string; merchant_id: string; location: string } | null;
};

export default function StaticQrisOverlay({ visible, onClose, data }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay} testID="static-qris-overlay">
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>QRIS Statis</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="close-static-qris-btn">
              <X color={COLORS.textPrimary} size={22} />
            </TouchableOpacity>
          </View>
          {!data ? (
            <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 60 }} />
          ) : (
            <>
              <Text style={styles.merchant}>{data.merchant_name}</Text>
              <Text style={styles.location}>{data.location}</Text>
              <View style={styles.qrWrap} testID="qris-static-code">
                <QRCode value={data.qris_payload} size={240} color={COLORS.textPrimary} backgroundColor="#fff" />
              </View>
              <Text style={styles.midLabel}>Merchant ID</Text>
              <Text style={styles.midValue}>{data.merchant_id}</Text>
              <TouchableOpacity style={styles.shareBtn} testID="share-btn" activeOpacity={0.85}>
                <Share2 color="#fff" size={18} strokeWidth={2.2} />
                <Text style={styles.shareText}>Bagikan QRIS</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,42,38,0.55)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, alignItems: 'center' },
  handle: { width: 44, height: 5, backgroundColor: COLORS.divider, borderRadius: 4, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  merchant: { color: COLORS.primaryText, fontSize: 18, fontWeight: '800', marginTop: 8 },
  location: { color: COLORS.textSecondary, marginTop: 2 },
  qrWrap: { padding: 16, marginTop: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.cardBorder },
  midLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },
  midValue: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 20 },
  shareText: { color: '#fff', fontWeight: '800' },
});
