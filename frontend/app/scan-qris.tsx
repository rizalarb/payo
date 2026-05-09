import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera, RefreshCcw, ScanLine, FileText, QrCode, Sparkles } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../src/theme';
import { extractFromText, ocrFromImage, getAIStatus } from '../src/services/qvac';

type Mode = 'qr' | 'ocr';

const TRC20_RE = /T[1-9A-HJ-NP-Za-km-z]{33}/;

export default function ScanQris() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<Mode>('qr');
  const [processing, setProcessing] = useState(false);
  const [lastValue, setLastValue] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const aiStatus = getAIStatus();

  const handleAddress = (address: string, amount?: number) => {
    const params: any = { address, from: 'scan' };
    if (amount) params.amount = String(amount);
    const qs = new URLSearchParams(params).toString();
    router.replace(`/transfer?${qs}`);
  };

  const onScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLastValue(data);
    // Look for a TRC20 address inside the QR payload (handles both raw addresses and PAYO|... payloads).
    const match = data.match(TRC20_RE);
    if (match) {
      const addr = match[0];
      // Try to find amount inside the QR (e.g., AMOUNT=50, USDT=10)
      const am = data.match(/AMOUNT[=:](\d+(?:\.\d+)?)/i);
      const amount = am ? parseFloat(am[1]) : undefined;
      Alert.alert(
        'Alamat Terdeteksi',
        `Alamat USDT TRC20:\n${addr.slice(0, 12)}…${addr.slice(-6)}${amount ? `\nNominal: ${amount} USDT` : ''}\n\nLanjut ke Transfer?`,
        [
          { text: 'Batal', style: 'cancel', onPress: () => setScanned(false) },
          { text: 'Lanjut', onPress: () => handleAddress(addr, amount) },
        ],
      );
    } else {
      Alert.alert('QR Terbaca', `${data}\n\n(QR ini tidak mengandung alamat TRC20)`, [
        { text: 'Scan Lagi', onPress: () => setScanned(false) },
        { text: 'Selesai', onPress: () => router.back() },
      ]);
    }
  };

  const captureAndOcr = async () => {
    if (!cameraRef.current) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6, skipProcessing: true });
      const b64: string | undefined = photo?.base64;
      if (!b64) throw new Error('Gagal ambil foto');
      const result = await ocrFromImage(b64);
      const addresses = result.addresses;
      if (addresses.length === 0) {
        Alert.alert('Tidak Ada Alamat', `Teks dikenali (${result.mode}):\n\n${result.text.slice(0, 240)}\n\nTidak ditemukan alamat TRC20. Coba lagi dengan pencahayaan lebih baik.`);
        return;
      }
      const address = addresses[0];
      const amount = result.amounts_usdt[0] ?? undefined;
      Alert.alert(
        `Alamat Terdeteksi (${result.mode === 'qvac-offline' ? 'QVAC Offline' : 'Cloud OCR'})`,
        `${address.slice(0, 12)}…${address.slice(-6)}${amount ? `\nNominal: ${amount} USDT` : ''}\n\nLanjut ke Transfer?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjut', onPress: () => handleAddress(address, amount) },
        ],
      );
    } catch (e: any) {
      Alert.alert('OCR Gagal', e?.message ?? 'Coba lagi');
    } finally { setProcessing(false); }
  };

  if (!permission) {
    return <SafeAreaView style={styles.root} testID="scan-qris-screen"><Text style={styles.center}>Memuat…</Text></SafeAreaView>;
  }

  // Web fallback (no on-device camera here, but show a demo flow)
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-qris-screen">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QRIS / OCR Struk</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox}>
          <View style={styles.permIconWrap}>
            <ScanLine color={COLORS.primary} size={48} strokeWidth={1.6} />
          </View>
          <Text style={styles.permTitle}>Demo Pemindai</Text>
          <Text style={styles.permSub}>Pemindai kamera (QR & OCR) berjalan pada perangkat (Expo Go / build native). Untuk demo cepat, gunakan tombol berikut.</Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={() => handleAddress('TXYZ1aBcDeFg2hIjKlMnOpQ3rStUvWxY', 50)}
            testID="demo-qr-btn"
          >
            <QrCode color="#fff" size={18} strokeWidth={2.2} />
            <Text style={styles.permBtnText}>Demo: QR → Transfer 50 USDT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.primary }]}
            onPress={() => handleAddress('TLmNoPq4RsTuVwXy5zAbCdEfGhIjKlMn')}
            testID="demo-ocr-btn"
          >
            <FileText color={COLORS.primary} size={18} strokeWidth={2.2} />
            <Text style={[styles.permBtnText, { color: COLORS.primary }]}>Demo: OCR Struk → Transfer</Text>
          </TouchableOpacity>
          <Text style={styles.aiBadge}>{aiStatus.message}</Text>
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
          <Text style={styles.headerTitle}>Scan QRIS / OCR Struk</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox}>
          <View style={styles.permIconWrap}>
            <Camera color={COLORS.primary} size={48} strokeWidth={1.6} />
          </View>
          <Text style={styles.permTitle}>Izinkan Akses Kamera</Text>
          <Text style={styles.permSub}>PAYO membutuhkan kamera untuk memindai QR dan OCR struk. Akses hanya dipakai saat halaman ini terbuka.</Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={async () => {
              const r = await requestPermission();
              if (!r.granted) Alert.alert('Izin Ditolak', 'Buka pengaturan untuk mengaktifkan kamera.');
            }}
            testID="request-permission-btn"
          >
            <Camera color="#fff" size={18} strokeWidth={2.2} />
            <Text style={styles.permBtnText}>Berikan Izin Kamera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root} testID="scan-qris-screen">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={mode === 'qr' ? { barcodeTypes: ['qr'] } : undefined}
        onBarcodeScanned={mode === 'qr' && !scanned ? onScanned : undefined}
      />
      <SafeAreaView edges={['top']}>
        <View style={[styles.header, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, styles.backBtnDark]} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{mode === 'qr' ? 'Scan QRIS' : 'OCR Struk'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'qr' && styles.modeBtnActive]}
            onPress={() => { setMode('qr'); setScanned(false); }}
            testID="mode-qr-btn"
          >
            <QrCode color={mode === 'qr' ? '#fff' : 'rgba(255,255,255,0.7)'} size={16} />
            <Text style={[styles.modeText, mode === 'qr' && styles.modeTextActive]}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'ocr' && styles.modeBtnActive]}
            onPress={() => setMode('ocr')}
            testID="mode-ocr-btn"
          >
            <FileText color={mode === 'ocr' ? '#fff' : 'rgba(255,255,255,0.7)'} size={16} />
            <Text style={[styles.modeText, mode === 'ocr' && styles.modeTextActive]}>OCR Struk</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View pointerEvents="none" style={styles.scannerOverlay}>
        <View style={styles.scannerWindow}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.scanHint}>
          {mode === 'qr' ? 'Arahkan kamera ke kode QR' : 'Arahkan ke struk / alamat tujuan'}
        </Text>
        <View style={styles.aiBadgeWrap} pointerEvents="none">
          <Sparkles color="#fff" size={12} />
          <Text style={styles.aiBadgeText}>
            {aiStatus.mode === 'qvac-offline' ? 'QVAC Offline' : 'Cloud Fallback'}
          </Text>
        </View>
      </View>

      {/* OCR capture button */}
      {mode === 'ocr' && (
        <TouchableOpacity
          style={styles.captureBtn}
          onPress={captureAndOcr}
          disabled={processing}
          testID="capture-ocr-btn"
          activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" /> : (
            <>
              <FileText color="#fff" size={20} strokeWidth={2.4} />
              <Text style={styles.captureText}>Foto & OCR</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {scanned && mode === 'qr' && (
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
  modeToggle: {
    flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999, padding: 4, marginTop: 6, gap: 4,
  },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13 },
  modeTextActive: { color: '#fff' },
  permissionBox: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgLight, gap: 12 },
  permIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.bgWhite, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  permTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  permSub: { textAlign: 'center', color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  permBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '800' },
  aiBadge: { color: COLORS.textSecondary, fontSize: 11, marginTop: 16, textAlign: 'center', paddingHorizontal: 16, lineHeight: 16 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scannerWindow: { width: 260, height: 260 },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 8 },
  scanHint: { color: '#fff', marginTop: 24, fontWeight: '600' },
  aiBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(46,191,165,0.85)' },
  aiBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  captureBtn: { position: 'absolute', bottom: 60, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 16, borderRadius: 999, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  captureText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rescanBtn: { position: 'absolute', bottom: 60, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  rescanText: { color: '#fff', fontWeight: '700' },
  lastValueWrap: { position: 'absolute', top: 140, left: 24, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12 },
  lastValueText: { color: '#fff', fontSize: 12 },
});
