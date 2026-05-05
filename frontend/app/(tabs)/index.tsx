import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wallet,
  QrCode,
  ScanLine,
  ArrowDownToLine,
  ChevronRight,
  ReceiptText,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../../src/theme';
import { api, DashboardToday, Tx } from '../../src/api';

// PAYO custom logo (top-left): coin + check, outline
function PayoLogo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="20" stroke="#FFFFFF" strokeWidth="2.5" />
      <Path d="M16 24l6 6 12-12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 16h20M14 32h14" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.45" strokeLinecap="round" />
    </Svg>
  );
}

const formatUSDT = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatIDR = (n: number) =>
  'Rp' + Math.round(n).toLocaleString('id-ID');

const formatTxAmount = (tx: Tx) => {
  if (tx.currency === 'IDR') return formatIDR(tx.amount);
  return `${formatUSDT(tx.amount)} ${tx.currency}`;
};

const formatTxDate = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = months[d.getMonth()];
  const y = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${m} ${y}, ${hh}:${mm} WIB`;
};

const formatTodayDate = (iso: string) => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardToday | null>(null);
  const [recent, setRecent] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInIDR, setShowInIDR] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={styles.root} testID="dashboard-screen">
      {/* Teal header background */}
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={{ flex: 1, zIndex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar with logo */}
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
                  {showInIDR
                    ? formatIDR(data?.total_idr ?? 0)
                    : `${formatUSDT(data?.total_usdt ?? 0)} USDT`}
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

          {/* Receive payment block */}
          <View style={styles.actionsCard} testID="actions-card">
            <Text style={styles.sectionLabel}>Terima Pembayaran</Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/input-manual')}
              testID="input-manual-btn"
              activeOpacity={0.8}
            >
              <Banknote color={COLORS.primary} size={22} strokeWidth={2} />
              <Text style={styles.actionBtnText}>Input Nominal Langsung & QRIS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/static-qris')}
              testID="open-qris-btn"
              activeOpacity={0.8}
            >
              <QrCode color={COLORS.primary} size={22} strokeWidth={2} />
              <Text style={styles.actionBtnText}>Tampilkan QRIS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawRow}
              onPress={() => router.push('/transfer')}
              testID="transfer-btn"
              activeOpacity={0.7}
            >
              <Wallet color={COLORS.primary} size={22} strokeWidth={2} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.withdrawTitle}>Tarik Pendapatan Sekarang</Text>
                <Text style={styles.withdrawSub}>Withdraw kapan saja dan kemana saja</Text>
              </View>
              <ChevronRight color={COLORS.primary} size={22} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Scan QRIS quick action */}
          <TouchableOpacity
            style={styles.scanCta}
            onPress={() => router.push('/scan-qris')}
            testID="scan-qris-btn"
            activeOpacity={0.85}
          >
            <ScanLine color="#fff" size={20} strokeWidth={2.2} />
            <Text style={styles.scanCtaText}>Scan QRIS</Text>
          </TouchableOpacity>

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
                      {tx.direction === 'IN' ? (
                        <ArrowDownLeft color={COLORS.primary} size={20} strokeWidth={2.2} />
                      ) : (
                        <ArrowUpRight color={COLORS.primary} size={20} strokeWidth={2.2} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txType}>{labelType(tx.type)}</Text>
                      <Text style={styles.txDate}>{formatTxDate(tx.timestamp)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, tx.direction === 'OUT' && { color: COLORS.danger }]}>
                        {tx.direction === 'OUT' ? '-' : ''}
                        {formatTxAmount(tx)}
                      </Text>
                    </View>
                  </View>
                  {idx < recent.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function labelType(t: string) {
  switch (t) {
    case 'USDT': return 'USDT';
    case 'USDC': return 'USDC';
    case 'QRIS_STATIS': return 'QRIS Statis';
    case 'QRIS_DINAMIS': return 'QRIS Dinamis';
    case 'TRANSFER': return 'Transfer';
    default: return t;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  headerBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
    backgroundColor: COLORS.primary,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  logoWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  brandText: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 12, letterSpacing: 1.5 },
  welcomeCard: {
    marginTop: 8, marginHorizontal: 20,
    padding: 20, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  welcomeLabel: { color: '#fff', fontSize: 22, fontWeight: '800' },
  eventName: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  eventLoc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
  incomeCard: {
    marginTop: 16, marginHorizontal: 20,
    padding: 18, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  incomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incomeLabel: { color: COLORS.primaryText, fontSize: 13, fontWeight: '500' },
  incomeDate: { fontWeight: '800' },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  incomeAmount: { color: COLORS.primaryText, fontSize: 36, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  rateHint: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  actionsCard: {
    marginTop: 16, marginHorizontal: 20,
    padding: 16, borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12, fontWeight: '600' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 12,
    marginBottom: 12, gap: 12,
  },
  actionBtnText: { color: COLORS.primaryText, fontSize: 15, fontWeight: '700' },
  withdrawRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  withdrawTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: '700' },
  withdrawSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  scanCta: {
    marginTop: 16, marginHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 14,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  scanCtaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 24, paddingHorizontal: 24,
  },
  recentTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  recentCard: {
    marginTop: 12, marginHorizontal: 20,
    padding: 16, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  txIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.bgLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  txType: { color: COLORS.primaryText, fontSize: 15, fontWeight: '700' },
  txDate: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  txAmount: { color: COLORS.primaryText, fontSize: 16, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.divider },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 24 },
});
