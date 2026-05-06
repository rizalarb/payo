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

export default function VoiceMicButton({ onIntent, testID }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const pulse = useRef(new Animated.Value(0)).current;

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
    }
  }, [recording, pulse]);

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
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e: any) {
      Alert.alert('Mikrofon error', e?.message ?? 'Tidak bisa merekam');
    }
  };

  const stopAndSend = async () => {
    if (!recording) return;
    try {
      setIsProcessing(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error('No recording uri');
      const mime = uri.endsWith('.m4a') ? 'audio/m4a' : uri.endsWith('.wav') ? 'audio/wav' : 'audio/mp4';
      const res = await api.voiceParseAudio(uri, mime);
      onIntent(res.intent, res.transcript);
    } catch (e: any) {
      Alert.alert('Voice error', e?.message ?? 'Gagal proses suara');
    } finally {
      setIsProcessing(false);
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
    if (recording) stopAndSend();
    else startRecording();
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <>
      <View style={styles.wrap}>
        {recording && (
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
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
          {isProcessing ? 'Memproses…' : recording ? 'Tap untuk stop' : 'Tap & ucap perintah'}
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
  btn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  btnRecording: { backgroundColor: '#E5484D', shadowColor: '#E5484D' },
  hint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, fontWeight: '600' },
  tBack: { flex: 1, backgroundColor: 'rgba(15,42,38,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tCard: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  tTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  tSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 },
  tInput: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12, padding: 12, color: COLORS.textPrimary },
  tCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.bgLight },
  tOk: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
});
