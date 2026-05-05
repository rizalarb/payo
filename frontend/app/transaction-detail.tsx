import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { COLORS } from '../src/theme';
import { api, Tx } from '../src/api';

const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${monthsId[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
}
function fmtAmt(tx: Tx) {
  if (tx.currency === 'IDR') return 'Rp' + Math.round(tx.amount).toLocaleString('id-ID');
  return `${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tx.currency}`;
}
function label(t: string) {
  return ({ USDT: 'USDT', USDC: 'USDC', QRIS_STATIS: 'QRIS Statis', QRIS_DINAMIS: 'QRIS Dinamis', TRANSFER: 'Transfer' } as any)[t] || t;
}

export default function TransactionDetail() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Tx[]; total_pages: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const limit = 5;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.listTransactions(p, limit);
      setData(res);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="transaction-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.summaryCard} testID="summary-card">
        <Text style={styles.summaryLabel}>Total Transaksi</Text>
        <Text style={styles.summaryValue}>{data?.total ?? 0}</Text>
        <Text style={styles.summarySub}>Halaman {page} dari {data?.total_pages ?? 1}</Text>
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page); }} />}
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>Tidak ada transaksi</Text>
        )}
        renderItem={({ item, index }) => (
          <View style={styles.card} testID={`tx-row-${index}`}>
            <View style={styles.txIconWrap}>
              {item.direction === 'IN'
                ? <ArrowDownLeft color={COLORS.primary} size={22} strokeWidth={2.2} />
                : <ArrowUpRight color={COLORS.primary} size={22} strokeWidth={2.2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{label(item.type)}</Text>
              {item.counterparty && <Text style={styles.txParty}>{item.counterparty}</Text>}
              <Text style={styles.txDate}>{fmtDate(item.timestamp)}</Text>
            </View>
            <Text style={[styles.txAmt, item.direction === 'OUT' && { color: COLORS.danger }]}>
              {item.direction === 'OUT' ? '-' : ''}{fmtAmt(item)}
            </Text>
          </View>
        )}
      />

      {/* Pagination */}
      <View style={styles.pagination} testID="pagination">
        <TouchableOpacity
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          disabled={page <= 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          testID="prev-page-btn"
        >
          <ChevronLeft color={page <= 1 ? COLORS.textMuted : COLORS.primary} size={20} />
          <Text style={[styles.pageBtnText, page <= 1 && { color: COLORS.textMuted }]}>Sebelumnya</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>{page} / {data?.total_pages ?? 1}</Text>
        <TouchableOpacity
          style={[styles.pageBtn, (data && page >= data.total_pages) ? styles.pageBtnDisabled : null]}
          disabled={!data || page >= (data?.total_pages ?? 1)}
          onPress={() => setPage((p) => p + 1)}
          testID="next-page-btn"
        >
          <Text style={[styles.pageBtnText, (data && page >= data.total_pages) && { color: COLORS.textMuted }]}>Berikutnya</Text>
          <ChevronRight color={(data && page >= data.total_pages) ? COLORS.textMuted : COLORS.primary} size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgLight },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  summaryCard: {
    margin: 16, padding: 18, borderRadius: 16, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 13 },
  summaryValue: { color: COLORS.primaryText, fontSize: 28, fontWeight: '800', marginTop: 4 },
  summarySub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  txIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bgLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
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
  pageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  pageBtnDisabled: { borderColor: COLORS.divider, backgroundColor: COLORS.bgLight },
  pageBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  pageInfo: { color: COLORS.textSecondary, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
