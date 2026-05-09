import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  QrCode, ScanLine, ArrowDownToLine, ChevronRight, ArrowUpRight, ArrowDownLeft,
  Briefcase, Pencil, Wallet,
} from 'lucide-react-native';
import { COLORS } from '../../src/theme';
import { api, DashboardToday, Tx } from '../../src/api';
import StaticQrisOverlay from '../../src/components/StaticQrisOverlay';

// PAYO logo (top-left) — uses uploaded brand image
function PayoLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/images/payo-logo.jpeg')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      resizeMode="cover"
    />
  );
}

const formatUSDT = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatIDR = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

const formatTxAmount = (tx: Tx) => {
  if (tx.currency === 'IDR') return formatIDR(tx.amount);
  return `${formatUSDT(tx.amount)} ${tx.currency}`;
};

const formatTxDate = (iso: string) => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
};

const formatTodayDate = (iso: string) => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

function labelType(t: string) {
  return ({ USDT: 'USDT', USDC: 'USDC', QRIS_STATIS: 'QRIS Statis', QRIS_DINAMIS: 'QRIS Dinamis', TRANSFER: 'Transfer', WITHDRAW: 'Withdraw' } as any)[t] || t;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardToday | null>(null);
  const [recent, setRecent] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInIDR, setShowInIDR] = useState(false);
  const [qrisOverlayOpen, setQrisOverlayOpen] = useState(false);
  const [qrisData, setQrisData] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([api.dashboardToday(), api.recentTransactions(5)]);
      setData(d);
      setRecent(r.items);
    } catch (e) {
      console.warn('Dashboard load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const openStaticQris = async () => {
    setQrisOverlayOpen(true);
    if (!qrisData) {
      try { setQrisData(await api.staticQris()); } catch {}
    }
  };

  const ActionTile = ({ Icon, label, onPress, testID }: { Icon: any; label: string; onPress: () => void; testID: string }) => (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.85} testID={testID}>
      <Icon color={COLORS.primary} size={22} strokeWidth={2} />
      <Text style={styles.actionTileText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root} testID="dashboard-screen">
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={{ flex: 1, zIndex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar with new logo + brand */}
          <View style={styles.topBar}>
            <View style={styles.logoWrap} testID="payo-logo">
              <PayoLogo size={32} />
            </View>
            <Text style={styles.brandText}>PAYO</Text>
          </View>

          {/* Welcome card */}
          <View style={styles.welcomeCard} testID="welcome-card">
            <Text style={styles.welcomeLabel}>Welcome to PAYO</Text>
            <Text style={styles.eventName}>{data?.event ?? 'Milea Concert'}</Text>
            <Text style={styles.eventLoc}>{data?.location ?? 'Cengkareng, Jakarta Barat'}</Text>
          </View>

          {/* Income card */}
          <View style={styles.incomeCard} testID="income-card">
            <View style={styles.incomeHeader}>
              <Text style={styles.incomeLabel}>
                Pendapatan Hari Ini, <Text style={styles.incomeDate}>{data ? formatTodayDate(data.date) : '—'}</Text>
              </Text>
              <TouchableOpacity onPress={() => router.push('/transaction-detail')} testID="lihat-detail-btn">
                <Text style={styles.linkText}>Lihat Detail</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowInIDR((v) => !v)} activeOpacity={0.7} testID="amount-toggle">
              {loading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.incomeAmount}>
                  {showInIDR ? formatIDR(data?.total_idr ?? 0) : `${formatUSDT(data?.total_usdt ?? 0)} USDT`}
                </Text>
              )}
            </TouchableOpacity>
            {!loading && data && (
              <Text style={styles.rateHint}>
                {showInIDR ? `≈ ${formatUSDT(data.total_usdt)} USDT` : `≈ ${formatIDR(data.total_idr)}`}
                {' · '}1 USDT = {formatIDR(data.rate_usdt_idr)}
              </Text>
            )}
          </View>

          {/* Receive payment block — 2x2 grid */}
          <View style={styles.actionsCard} testID="actions-card">
            <Text style={styles.sectionLabel}>Terima Pembayaran</Text>
            <View style={styles.gridRow}>
              <ActionTile Icon={Briefcase} label="Transfer" onPress={() => router.push('/transfer')} testID="transfer-btn" />
              <ActionTile Icon={ScanLine} label={'Scan\nQRIS'} onPress={() => router.push('/scan-qris')} testID="scan-qris-btn" />
            </View>
            <View style={styles.gridRow}>
              <ActionTile Icon={Pencil} label={'Input Nominal\nQRIS'} onPress={() => router.push('/input-manual')} testID="input-manual-btn" />
              <ActionTile Icon={QrCode} label={'Open\nQRIS'} onPress={openStaticQris} testID="open-qris-btn" />
            </View>

            <TouchableOpacity
              style={styles.withdrawRow}
              onPress={() => router.push('/withdraw')}
              testID="withdraw-btn"
              activeOpacity={0.7}
            >
              <Wallet color={COLORS.primary} size={22} strokeWidth={2} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.withdrawTitle}>Tarik Pendapatan QRIS Sekarang</Text>
                <Text style={styles.withdrawSub}>Bisa kapan saja, di luar jadwal yang dipilih</Text>
              </View>
              <ChevronRight color={COLORS.primary} size={22} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Recent transactions */}
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Transaksi Terakhir</Text>
            <TouchableOpacity onPress={() => router.push('/all-transactions')} testID="lihat-semua-btn">
              <Text style={styles.linkText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentCard} testID="recent-tx-list">
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 24 }} />
            ) : recent.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada transaksi</Text>
            ) : (
              recent.map((tx, idx) => (
                <View key={tx.id} testID={`recent-tx-${idx}`}>
                  <View style={styles.txRow}>
                    <View style={styles.txIconWrap}>
                      {tx.direction === 'IN'
                        ? <ArrowDownLeft color={COLORS.primary} size={20} strokeWidth={2.2} />
                        : <ArrowUpRight color={COLORS.primary} size={20} strokeWidth={2.2} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txType}>{labelType(tx.type)}</Text>
                      <Text style={styles.txDate}>{formatTxDate(tx.timestamp)}</Text>
                    </View>
                    <Text style={[styles.txAmount, tx.direction === 'OUT' && { color: COLORS.danger }]}>
                      {tx.direction === 'OUT' ? '-' : ''}{formatTxAmount(tx)}
                    </Text>
                  </View>
                  {idx < recent.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Open QRIS overlay (on same page) */}
      <StaticQrisOverlay
        visible={qrisOverlayOpen}
        onClose={() => setQrisOverlayOpen(false)}
        data={qrisData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 320, backgroundColor: COLORS.primary },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  logoWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  brandText: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 12, letterSpacing: 1.5 },
  welcomeCard: {
    marginTop: 8, marginHorizontal: 20, padding: 20, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  welcomeLabel: { color: '#fff', fontSize: 22, fontWeight: '800' },
  eventName: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  eventLoc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
  incomeCard: {
    marginTop: 16, marginHorizontal: 20, padding: 18, borderRadius: 16, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  incomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incomeLabel: { color: COLORS.primaryText, fontSize: 13, fontWeight: '500' },
  incomeDate: { fontWeight: '800' },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  incomeAmount: { color: COLORS.primaryText, fontSize: 36, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  rateHint: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  actionsCard: {
    marginTop: 16, marginHorizontal: 20, padding: 16, borderRadius: 18, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12, fontWeight: '600' },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionTile: {
    flex: 1, paddingVertical: 18, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 64,
  },
  actionTileText: { color: COLORS.primaryText, fontSize: 14, fontWeight: '700', textAlign: 'left' },
  withdrawRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginTop: 4 },
  withdrawTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: '700' },
  withdrawSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  recentTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  recentCard: {
    marginTop: 12, marginHorizontal: 20, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  txIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txType: { color: COLORS.primaryText, fontSize: 15, fontWeight: '700' },
  txDate: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  txAmount: { color: COLORS.primaryText, fontSize: 16, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.divider },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 24 },
});
