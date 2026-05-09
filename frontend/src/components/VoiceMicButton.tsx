import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Easing, Platform, Alert, Modal, TextInput } from 'react-native';
import { Mic, Square, Loader2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../theme';
import { api, VoiceIntent } from '../api';

type Props = {
  onIntent: (intent: VoiceIntent, transcript: string) => void;
  testID?: string;
};

// VAD thresholds (expo-av metering returns dB, range ~-160 to 0)
const SILENCE_DB = -38;            // below this is "silence"
const SILENCE_HOLD_MS = 1400;      // stop after this much continuous silence
const MIN_RECORD_MS = 700;         // require at least this much before allowing silence stop
const MAX_RECORD_MS = 12000;       // hard ceiling

export default function VoiceMicButton({ onIntent, testID }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [meterLevel, setMeterLevel] = useState(0); // 0..1 normalized
  const pulse = useRef(new Animated.Value(0)).current;
  const startedAtRef = useRef<number>(0);
  const silenceSinceRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
      setMeterLevel(0);
    }
  }, [recording, pulse]);

  const onStatusUpdate = (status: Audio.RecordingStatus) => {
    if (!status.isRecording) return;
    const metering = (status as any).metering as number | undefined;
    const elapsed = Date.now() - startedAtRef.current;

    if (typeof metering === 'number') {
      // Normalize for visualization
      const norm = Math.min(1, Math.max(0, (metering + 60) / 60));
      setMeterLevel(norm);

      // Silence detection
      if (metering < SILENCE_DB) {
        if (silenceSinceRef.current === null) silenceSinceRef.current = Date.now();
      } else {
        silenceSinceRef.current = null;
      }
    }

    const silentFor = silenceSinceRef.current ? Date.now() - silenceSinceRef.current : 0;
    if (!stoppingRef.current && elapsed >= MIN_RECORD_MS && silentFor >= SILENCE_HOLD_MS) {
      stoppingRef.current = true;
      stopAndSend();
    } else if (!stoppingRef.current && elapsed >= MAX_RECORD_MS) {
      stoppingRef.current = true;
      stopAndSend();
    }
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') { setTextModalOpen(true); return; }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Izin Mikrofon', 'PAYO butuh akses mikrofon untuk perintah suara.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      const opts = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      } as any;
      await rec.prepareToRecordAsync(opts);
      rec.setOnRecordingStatusUpdate(onStatusUpdate);
      rec.setProgressUpdateInterval(120);
      startedAtRef.current = Date.now();
      silenceSinceRef.current = null;
      stoppingRef.current = false;
      await rec.startAsync();
      setRecording(rec);
    } catch (e: any) {
      Alert.alert('Mikrofon error', e?.message ?? 'Tidak bisa merekam');
    }
  };

  const stopAndSend = async () => {
    const rec = recording;
    if (!rec) return;
    try {
      setIsProcessing(true);
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);
      if (!uri) throw new Error('No recording uri');
      const mime = uri.endsWith('.m4a') ? 'audio/m4a' : uri.endsWith('.wav') ? 'audio/wav' : 'audio/mp4';
      const res = await api.voiceParseAudio(uri, mime);
      onIntent(res.intent, res.transcript);
    } catch (e: any) {
      Alert.alert('Voice error', e?.message ?? 'Gagal proses suara');
    } finally {
      setIsProcessing(false);
      stoppingRef.current = false;
    }
  };

  const submitTyped = async () => {
    const t = typed.trim();
    if (!t) return;
    setTextModalOpen(false);
    setTyped('');
    try {
      setIsProcessing(true);
      const res = await api.voiceParseText(t);
      onIntent(res.intent, res.transcript);
    } catch (e: any) {
      Alert.alert('Voice error', e?.message ?? 'Gagal');
    } finally {
      setIsProcessing(false);
    }
  };

  const onPress = () => {
    if (isProcessing) return;
    if (recording) {
      // user manual override — still send what we have
      stoppingRef.current = true;
      stopAndSend();
    } else {
      startRecording();
    }
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const meterScale = 1 + meterLevel * 0.6;

  return (
    <>
      <View style={styles.wrap}>
        {recording && (
          <>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
            <Animated.View style={[styles.meterRing, { transform: [{ scale: meterScale }] }]} />
          </>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={[styles.btn, recording && styles.btnRecording]}
          testID={testID || 'voice-mic-btn'}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 color="#fff" size={22} /> : recording ? <Square color="#fff" size={22} fill="#fff" /> : <Mic color="#fff" size={22} strokeWidth={2.2} />}
        </TouchableOpacity>
        <Text style={styles.hint}>
          {isProcessing ? 'Memproses…' : recording ? 'Mendengar… (auto-stop saat hening)' : 'Tap & ucap perintah'}
        </Text>
      </View>

      <Modal visible={textModalOpen} transparent animationType="fade" onRequestClose={() => setTextModalOpen(false)}>
        <View style={styles.tBack}>
          <View style={styles.tCard}>
            <Text style={styles.tTitle}>Perintah Suara (Web Fallback)</Text>
            <Text style={styles.tSub}>Ketik perintah, contoh: &quot;transfer 50 USDT ke Andi&quot; atau &quot;tarik 500 ribu ke BCA&quot;</Text>
            <TextInput
              style={styles.tInput}
              value={typed}
              onChangeText={setTyped}
              placeholder="transfer 50 USDT ke Andi"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              testID="voice-text-input"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={styles.tCancel} onPress={() => setTextModalOpen(false)} testID="voice-text-cancel">
                <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tOk} onPress={submitTyped} testID="voice-text-submit">
                <Text style={{ color: '#fff', fontWeight: '800' }}>Proses</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary },
  meterRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(229,72,77,0.25)' },
  btn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  btnRecording: { backgroundColor: '#E5484D', shadowColor: '#E5484D' },
  hint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, fontWeight: '600', textAlign: 'center', maxWidth: 140 },
  tBack: { flex: 1, backgroundColor: 'rgba(15,42,38,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tCard: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  tTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  tSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 },
  tInput: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12, padding: 12, color: COLORS.textPrimary },
  tCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bgLight },
  tOk: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
});
