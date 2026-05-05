import React from 'react';
import { View, StyleSheet } from 'react-native';
import AllTransactions from '../all-transactions';

export default function Pendapatan() {
  return (
    <View style={styles.root}>
      <AllTransactions embedded />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F5FFFB' } });
