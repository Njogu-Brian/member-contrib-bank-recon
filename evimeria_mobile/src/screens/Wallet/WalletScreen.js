import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, Surface, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing } from '../../theme';

export default function WalletScreen({ navigation }) {
  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.WALLET);
      return response.data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ['wallet-history'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.WALLET_HISTORY);
      return response.data;
    },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
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
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <Card style={styles.balanceCard}>
        <Card.Content>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(wallet?.balance)}
          </Text>
          
          <View style={styles.balanceDetails}>
            <View style={styles.balanceDetailItem}>
              <Text style={styles.detailLabel}>Total In</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(wallet?.total_credits)}
              </Text>
            </View>
            <View style={styles.balanceDetailItem}>
              <Text style={styles.detailLabel}>Total Out</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(wallet?.total_debits)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Payment')}
        >
          <Icon name="plus-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Add Money</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Statement')}
        >
          <Icon name="file-document" size={24} color={theme.colors.secondary} />
          <Text style={styles.actionButtonText}>View Statement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {history?.data?.length > 0 ? (
          history.data.slice(0, 10).map((item, index) => (
            <Surface key={index} style={styles.historyItem} elevation={1}>
              <View style={styles.historyContent}>
                <View style={[
                  styles.historyIcon,
                  { backgroundColor: item.credit > 0 ? theme.colors.success + '20' : theme.colors.error + '20' }
                ]}>
                  <Icon
                    name={item.credit > 0 ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={item.credit > 0 ? theme.colors.success : theme.colors.error}
                  />
                </View>
                <View style={styles.historyDetails}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {item.description || item.type}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  {item.running_balance !== undefined && (
                    <Text style={styles.runningBalance}>
                      Balance: {formatCurrency(item.running_balance)}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.historyAmount,
                  { color: item.credit > 0 ? theme.colors.success : theme.colors.error }
                ]}>
                  {item.credit > 0 ? '+' : '-'}{formatCurrency(Math.abs(item.credit || item.debit))}
                </Text>
              </View>
            </Surface>
          ))
        ) : (
          <Text style={styles.emptyText}>No transactions yet</Text>
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
  balanceCard: {
    margin: spacing.md,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: spacing.sm,
  },
  balanceDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  balanceDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  historySection: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  historyItem: {
    marginBottom: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  historyDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  runningBalance: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: spacing.xl,
  },
});

