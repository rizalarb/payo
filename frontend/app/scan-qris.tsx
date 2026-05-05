import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera, RefreshCcw, ScanLine } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../src/theme';

export default function ScanQris() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastValue, setLastValue] = useState<string | null>(null);

  const onScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLastValue(data);
    Alert.alert('QRIS Terbaca', data, [
      { text: 'Scan Lagi', onPress: () => setScanned(false) },
      { text: 'Selesai', onPress: () => router.back() },
    ]);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.root} testID="scan-qris-screen">
        <Text style={styles.center}>Memuat...</Text>
      </SafeAreaView>
    );
  }

  // Web fallback: camera scanner only works on native devices
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-qris-screen">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QRIS</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox}>
          <View style={styles.permIconWrap}>
            <ScanLine color={COLORS.primary} size={48} strokeWidth={1.6} />
          </View>
          <Text style={styles.permTitle}>Pemindai Tersedia di Perangkat</Text>
          <Text style={styles.permSub}>Pemindai QRIS hanya berjalan pada perangkat (Expo Go / build native). Buka pada HP Anda untuk mencoba.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => router.back()} testID="back-from-web-btn">
            <Text style={styles.permBtnText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-qris-screen">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QRIS</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox} testID="permission-box">
          <View style={styles.permIconWrap}>
            <Camera color={COLORS.primary} size={48} strokeWidth={1.6} />
          </View>
          <Text style={styles.permTitle}>Izinkan Akses Kamera</Text>
          <Text style={styles.permSub}>
            PAYO membutuhkan akses kamera untuk memindai QRIS pembayaran. Akses hanya dipakai saat halaman ini terbuka.
          </Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={async () => {
              const r = await requestPermission();
              if (!r.granted) {
                Alert.alert('Izin Ditolak', 'Buka pengaturan untuk mengaktifkan kamera.');
              }
            }}
            testID="request-permission-btn"
            activeOpacity={0.85}
          >
            <Camera color="#fff" size={18} strokeWidth={2.2} />
            <Text style={styles.permBtnText}>Berikan Izin Kamera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Web fallback (no camera in preview)
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-qris-screen">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QRIS</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox}>
          <View style={styles.permIconWrap}>
            <ScanLine color={COLORS.primary} size={48} strokeWidth={1.6} />
          </View>
          <Text style={styles.permTitle}>Izin Kamera Diberikan</Text>
          <Text style={styles.permSub}>Pemindai QRIS hanya tersedia pada perangkat (Expo Go / build native). Buka pada HP Anda untuk mencoba.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => router.back()} testID="back-from-web-btn">
            <Text style={styles.permBtnText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root} testID="scan-qris-screen">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : onScanned}
      />
      <SafeAreaView edges={['top']}>
        <View style={[styles.header, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, styles.backBtnDark]} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QRIS</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <View pointerEvents="none" style={styles.scannerOverlay}>
        <View style={styles.scannerWindow}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.scanHint}>Arahkan kamera ke kode QRIS</Text>
      </View>
      {scanned && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)} testID="rescan-btn">
          <RefreshCcw color="#fff" size={18} />
          <Text style={styles.rescanText}>Scan Lagi</Text>
        </TouchableOpacity>
      )}
      {lastValue && (
        <View style={styles.lastValueWrap} pointerEvents="none">
          <Text style={styles.lastValueText} numberOfLines={2}>{lastValue}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { color: '#fff', textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.primary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnDark: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permissionBox: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgLight },
  permIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.bgWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.cardBorder },
  permTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  permSub: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 8, marginBottom: 24, lineHeight: 20 },
  permBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '800' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scannerWindow: { width: 260, height: 260 },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 8 },
  scanHint: { color: '#fff', marginTop: 24, fontWeight: '600' },
  rescanBtn: { position: 'absolute', bottom: 60, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  rescanText: { color: '#fff', fontWeight: '700' },
  lastValueWrap: { position: 'absolute', top: 80, left: 24, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12 },
  lastValueText: { color: '#fff', fontSize: 12 },
});
