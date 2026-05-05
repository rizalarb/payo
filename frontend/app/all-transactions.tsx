import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { COLORS } from '../src/theme';
import { api, Tx } from '../src/api';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
}
function fmtAmt(tx: Tx) {
  if (tx.currency === 'IDR') return 'Rp' + Math.round(tx.amount).toLocaleString('id-ID');
  return `${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tx.currency}`;
}
const label = (t: string) => ({ USDT: 'USDT', USDC: 'USDC', QRIS_STATIS: 'QRIS Statis', QRIS_DINAMIS: 'QRIS Dinamis', TRANSFER: 'Transfer' } as any)[t] || t;

export default function AllTransactions({ embedded }: { embedded?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Tx[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadMore = useCallback(async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    const p = reset ? 1 : page;
    try {
      const res = await api.listTransactions(p, 10);
      setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setHasMore(p < res.total_pages);
      setPage(p + 1);
    } finally { setLoading(false); setInitialLoading(false); }
  }, [loading, hasMore, page]);

  useEffect(() => { loadMore(true); /* eslint-disable-next-line */ }, []);

  return (
    <SafeAreaView style={styles.root} edges={embedded ? ['top'] : ['top']} testID="all-transactions-screen">
      <View style={[styles.header, embedded && { backgroundColor: '#fff' }]}>
        {!embedded ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={[styles.headerTitle, embedded && { color: COLORS.textPrimary }]}>
          {embedded ? 'Pendapatan' : 'Semua Transaksi'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16 }}
        onEndReachedThreshold={0.4}
        onEndReached={() => loadMore(false)}
        ListEmptyComponent={initialLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>Tidak ada transaksi</Text>
        )}
        ListFooterComponent={loading && !initialLoading ? <ActivityIndicator color={COLORS.primary} style={{ margin: 12 }} /> : null}
        renderItem={({ item, index }) => (
          <View style={styles.card} testID={`all-tx-row-${index}`}>
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
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
