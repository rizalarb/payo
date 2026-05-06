import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react-native';
import { COLORS } from '../../src/theme';
import { api, DailySummaryItem, Tx } from '../../src/api';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function fmtDayLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtUSDT(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtIDR(n: number) { return 'Rp' + Math.round(n).toLocaleString('id-ID'); }

function fmtTxAmt(tx: Tx) {
  if (tx.currency === 'IDR') return fmtIDR(tx.amount);
  return `${fmtUSDT(tx.amount)} ${tx.currency}`;
}
function fmtTxDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
}
const txLabel = (t: string) => ({ USDT: 'USDT', USDC: 'USDC', QRIS_STATIS: 'QRIS Statis', QRIS_DINAMIS: 'QRIS Dinamis', TRANSFER: 'Transfer', WITHDRAW: 'Withdraw' } as any)[t] || t;

export default function PendapatanTab() {
  const router = useRouter();
  const [days, setDays] = useState<DailySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // for the day-detail view
  const [dayItems, setDayItems] = useState<Tx[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadDays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.dailySummary(14);
      setDays(res.items);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDays(); }, [loadDays]);

  const loadDay = useCallback(async (date: string, p: number) => {
    setDayLoading(true);
    try {
      const res = await api.listTransactions(p, 5, date);
      setDayItems(res.items);
      setPage(res.page);
      setTotalPages(res.total_pages);
    } finally { setDayLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedDate) loadDay(selectedDate, 1);
  }, [selectedDate, loadDay]);

  if (selectedDate) {
    const dayTotal = days.find((d) => d.date === selectedDate);
    return (
      <SafeAreaView style={styles.root} edges={['top']} testID="day-detail-screen">
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.backBtn} testID="back-to-days-btn">
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailHeaderTitle}>Detail Pendapatan</Text>
            <Text style={styles.detailHeaderSub}>{fmtDayLabel(selectedDate)}</Text>
          </View>
        </View>

        {dayTotal && (
          <View style={styles.summaryCard} testID="day-summary-card">
            <Text style={styles.summaryLabel}>Total Pendapatan</Text>
            <Text style={styles.summaryValue}>{fmtUSDT(dayTotal.total_usdt)} USDT</Text>
            <Text style={styles.summarySub}>≈ {fmtIDR(dayTotal.total_idr)} · {dayTotal.count} transaksi</Text>
          </View>
        )}

        <FlatList
          data={dayItems}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={dayLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : <Text style={styles.empty}>Tidak ada transaksi pada tanggal ini</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.txCard} testID={`day-tx-${index}`}>
              <View style={styles.txIconWrap}>
                {item.direction === 'IN'
                  ? <ArrowDownLeft color={COLORS.primary} size={22} strokeWidth={2.2} />
                  : <ArrowUpRight color={COLORS.primary} size={22} strokeWidth={2.2} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{txLabel(item.type)}</Text>
                {item.counterparty && <Text style={styles.txParty}>{item.counterparty}</Text>}
                <Text style={styles.txDate}>{fmtTxDate(item.timestamp)}</Text>
              </View>
              <Text style={[styles.txAmt, item.direction === 'OUT' && { color: COLORS.danger }]}>
                {item.direction === 'OUT' ? '-' : ''}{fmtTxAmt(item)}
              </Text>
            </View>
          )}
        />

        <View style={styles.pagination} testID="day-pagination">
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            disabled={page <= 1}
            onPress={() => loadDay(selectedDate, page - 1)}
            testID="day-prev-btn"
          >
            <Text style={[styles.pageBtnText, page <= 1 && { color: COLORS.textMuted }]}>Sebelumnya</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            disabled={page >= totalPages}
            onPress={() => loadDay(selectedDate, page + 1)}
            testID="day-next-btn"
          >
            <Text style={[styles.pageBtnText, page >= totalPages && { color: COLORS.textMuted }]}>Berikutnya</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // List of daily cards
  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="pendapatan-screen">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pendapatan</Text>
        <Text style={styles.headerSub}>Pilih tanggal untuk melihat detail transaksi</Text>
      </View>
      <FlatList
        data={days}
        keyExtractor={(it) => it.date}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : <Text style={styles.empty}>Belum ada data pendapatan</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.dayCard}
            onPress={() => setSelectedDate(item.date)}
            activeOpacity={0.85}
            testID={`day-card-${index}`}
          >
            <View style={styles.dayIconWrap}>
              <Calendar color={COLORS.primary} size={22} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dayLabel}>{fmtDayLabel(item.date)}</Text>
              <Text style={styles.dayCount}>{item.count} transaksi</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dayUSDT}>{fmtUSDT(item.total_usdt)} USDT</Text>
              <Text style={styles.dayIDR}>≈ {fmtIDR(item.total_idr)}</Text>
            </View>
            <ChevronRight color={COLORS.textMuted} size={18} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { color: COLORS.textSecondary, marginTop: 4 },
  dayCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  dayIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dayLabel: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  dayCount: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  dayUSDT: { color: COLORS.primaryText, fontWeight: '800', fontSize: 14 },
  dayIDR: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, padding: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  detailHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  detailHeaderSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  summaryCard: {
    margin: 16, padding: 18, borderRadius: 16, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 13 },
  summaryValue: { color: COLORS.primaryText, fontSize: 24, fontWeight: '800', marginTop: 4 },
  summarySub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff',
    borderRadius: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  txIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: '700' },
  txParty: { color: COLORS.textPrimary, fontSize: 13, marginTop: 2 },
  txDate: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  txAmt: { color: COLORS.primaryText, fontSize: 14, fontWeight: '800', marginLeft: 8 },
  pagination: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.divider,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20,
  },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  pageBtnDisabled: { borderColor: COLORS.divider, backgroundColor: COLORS.bgLight },
  pageBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  pageInfo: { color: COLORS.textSecondary, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
