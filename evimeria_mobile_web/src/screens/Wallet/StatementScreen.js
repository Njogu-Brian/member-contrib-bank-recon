import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, DataTable } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing } from '../../theme';

export default function StatementScreen() {
  const { data: statement, isLoading, refetch } = useQuery({
    queryKey: ['statements'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.STATEMENTS);
      return response.data;
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Statement</Text>
      </View>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Opening Balance</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(statement?.summary?.opening_balance)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Closing Balance</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {formatCurrency(statement?.summary?.closing_balance)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.summaryRow, { marginTop: spacing.md }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Credits</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success, fontSize: 16 }]}>
                {formatCurrency(statement?.summary?.total_credits)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Debits</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.error, fontSize: 16 }]}>
                {formatCurrency(statement?.summary?.total_debits)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        
        {statement?.statement?.length > 0 ? (
          <Card style={styles.tableCard}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title>Description</DataTable.Title>
                <DataTable.Title numeric>Amount</DataTable.Title>
                <DataTable.Title numeric>Balance</DataTable.Title>
              </DataTable.Header>

              {statement.statement.map((item, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>
                    {new Date(item.date).toLocaleDateString('en-GB')}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text numberOfLines={2} style={styles.description}>
                      {item.description}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={{
                      color: item.credit > 0 ? theme.colors.success : theme.colors.error,
                      fontWeight: '600',
                    }}>
                      {item.credit > 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(item.credit || item.debit))}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={styles.balance}>
                      {formatCurrency(item.running_balance)}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        ) : (
          <Text style={styles.emptyText}>No transactions found</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryCard: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  transactionsSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  tableCard: {
    borderRadius: 8,
  },
  description: {
    fontSize: 12,
  },
  balance: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: spacing.xl,
  },
});

