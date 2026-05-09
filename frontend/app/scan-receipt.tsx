import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera as CameraIcon, RefreshCcw, Receipt, Sparkles } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera } from 'expo-camera';
import { COLORS } from '../src/theme';
import { qvacAI } from '../src/qvac/qvacAI';

type OCRResult = Awaited<ReturnType<typeof qvacAI.ocrReceipt>>;

export default function ScanReceipt() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [qvacReady, setQvacReady] = useState<'idle' | 'init' | 'ready' | 'unavailable'>('idle');
  const cameraRef = React.useRef<any>(null);

  useEffect(() => {
    setQvacReady('init');
    qvacAI.init().then((ok) => setQvacReady(ok ? 'ready' : 'unavailable'));
  }, []);

  const capture = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false, skipProcessing: true });
      setPhotoUri(pic.uri);
    } catch (e: any) {
      Alert.alert('Kamera error', e?.message ?? 'Gagal memotret');
    }
  };

  const runOCR = async () => {
    if (!photoUri) return;
    setProcessing(true);
    try {
      const res = await qvacAI.ocrReceipt(photoUri);
      setResult(res);
    } catch (e: any) {
      Alert.alert('OCR Gagal', e?.message ?? 'Coba foto ulang');
    } finally { setProcessing(false); }
  };

  const reset = () => { setPhotoUri(null); setResult(null); };

  // Permissions
  if (!permission) {
    return <SafeAreaView style={styles.root}><ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-receipt-screen">
        <Header title="Scan Struk" onBack={() => router.back()} />
        <View style={styles.permBox}>
          <View style={styles.permIconWrap}><Receipt color={COLORS.primary} size={42} strokeWidth={1.6} /></View>
          <Text style={styles.permTitle}>Izinkan Akses Kamera</Text>
          <Text style={styles.permSub}>PAYO menggunakan kamera untuk memindai struk pembayaran. OCR berjalan offline di perangkat menggunakan QVAC SDK.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission} testID="request-permission-btn">
            <CameraIcon color="#fff" size={18} />
            <Text style={styles.permBtnText}>Berikan Izin Kamera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Result view
  if (result) {
    const fmt = (n: number | null | undefined) => (n != null ? 'Rp' + Math.round(n).toLocaleString('id-ID') : '—');
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-receipt-screen">
        <Header title="Hasil Scan Struk" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />}
          <View style={styles.resultCard}>
            <View style={styles.sourcePill}>
              <Sparkles color={COLORS.primary} size={14} />
              <Text style={styles.sourcePillText}>
                {result.source === 'qvac' ? 'OCR offline · QVAC SDK on-device' : 'OCR demo (web preview · native build untuk QVAC offline)'}
              </Text>
            </View>
            <Text style={styles.merchant}>{result.merchant ?? 'Merchant tidak terdeteksi'}</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{fmt(result.total)}</Text>
            </View>
            {result.items?.length ? (
              <View style={styles.itemsList}>
                {result.items.map((it, i) => (
                  <View key={i} style={styles.itemRow} testID={`receipt-item-${i}`}>
                    <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                    <Text style={styles.itemPrice}>{fmt(it.price)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {result.raw_text ? (
              <View style={styles.rawBox}>
                <Text style={styles.rawLabel}>Teks Mentah</Text>
                <Text style={styles.rawText} numberOfLines={6}>{result.raw_text}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionGhost} onPress={reset} testID="rescan-btn">
              <RefreshCcw color={COLORS.primary} size={18} />
              <Text style={styles.actionGhostText}>Scan Lagi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPrimary} onPress={() => router.back()} testID="done-btn">
              <Text style={styles.actionPrimaryText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Preview captured photo waiting for OCR
  if (photoUri) {
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="scan-receipt-screen">
        <Header title="Konfirmasi Foto" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          <View style={[styles.sourcePill, { alignSelf: 'center', marginTop: 12 }]}>
            <Sparkles color={COLORS.primary} size={14} />
            <Text style={styles.sourcePillText}>
              {qvacReady === 'ready' ? 'QVAC SDK ready · OCR akan berjalan offline'
                : qvacReady === 'init' ? 'Menyiapkan model offline…'
                : 'QVAC tidak tersedia (web preview) — pakai demo parser'}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionGhost} onPress={() => setPhotoUri(null)} testID="retake-btn">
              <RefreshCcw color={COLORS.primary} size={18} />
              <Text style={styles.actionGhostText}>Foto Ulang</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionPrimary, processing && { opacity: 0.6 }]} onPress={runOCR} disabled={processing} testID="run-ocr-btn">
              {processing ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Receipt color="#fff" size={18} />
                  <Text style={styles.actionPrimaryText}>Ekstrak Struk</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Camera live view
  return (
    <View style={[styles.root, { backgroundColor: '#000' }]} testID="scan-receipt-screen">
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
      <SafeAreaView edges={['top']}>
        <Header title="Scan Struk" onBack={() => router.back()} dark />
      </SafeAreaView>
      <View pointerEvents="none" style={styles.scannerOverlay}>
        <View style={styles.scannerWindow}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.scanHint}>Posisikan struk di dalam bingkai</Text>
      </View>
      <TouchableOpacity style={styles.shutter} onPress={capture} testID="shutter-btn" activeOpacity={0.8}>
        <View style={styles.shutterInner} />
      </TouchableOpacity>
    </View>
  );
}

function Header({ title, onBack, dark }: { title: string; onBack: () => void; dark?: boolean }) {
  return (
    <View style={[styles.header, dark && { backgroundColor: 'transparent' }]}>
      <TouchableOpacity onPress={onBack} style={[styles.backBtn, dark && { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 }]} testID="back-btn">
        <ChevronLeft color="#fff" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.primary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permBox: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  permIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.bgWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.cardBorder },
  permTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  permSub: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 8, marginBottom: 24, lineHeight: 20, paddingHorizontal: 12 },
  permBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '800' },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, backgroundColor: '#000' },
  resultCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 16 },
  sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.cardBorderSoft },
  sourcePillText: { color: COLORS.primaryText, fontSize: 11, fontWeight: '700' },
  merchant: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18, marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  totalLabel: { color: COLORS.textSecondary, fontWeight: '600' },
  totalValue: { color: COLORS.primaryText, fontWeight: '800', fontSize: 22 },
  itemsList: { marginTop: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  itemName: { color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  itemPrice: { color: COLORS.textPrimary, fontWeight: '700' },
  rawBox: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: COLORS.bgLight },
  rawLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  rawText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  actionGhost: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#fff' },
  actionGhostText: { color: COLORS.primary, fontWeight: '800' },
  actionPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary },
  actionPrimaryText: { color: '#fff', fontWeight: '800' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  scannerWindow: { width: 280, height: 360 },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 8 },
  scanHint: { color: '#fff', marginTop: 16, fontWeight: '600' },
  shutter: { position: 'absolute', bottom: 44, alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
