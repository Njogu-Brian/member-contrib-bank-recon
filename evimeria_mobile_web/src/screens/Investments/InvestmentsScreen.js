import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing } from '../../theme';

export default function InvestmentsScreen() {
  const { data: investments, isLoading, refetch } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.INVESTMENTS);
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
        <Text style={styles.headerTitle}>My Investments</Text>
        <Text style={styles.headerSubtitle}>Track your investment returns</Text>
      </View>

      {investments?.data?.length > 0 ? (
        investments.data.map((investment) => (
          <Card key={investment.id} style={styles.investmentCard}>
            <Card.Content>
              <View style={styles.investmentHeader}>
                <View style={styles.investmentTitleContainer}>
                  <Text style={styles.investmentName}>{investment.name}</Text>
                  <Chip
                    mode="flat"
                    style={[
                      styles.statusChip,
                      { backgroundColor: investment.status === 'active' ? theme.colors.success + '20' : '#E5E7EB' }
                    ]}
                    textStyle={{ fontSize: 12 }}
                  >
                    {investment.status}
                  </Chip>
                </View>
              </View>

              {investment.description && (
                <Text style={styles.description}>{investment.description}</Text>
              )}

              <View style={styles.investmentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Principal Amount</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(investment.principal_amount)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expected ROI</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                    {investment.expected_roi_rate}%
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(investment.start_date).toLocaleDateString()}
                  </Text>
                </View>
                
                {investment.end_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>End Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(investment.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="chart-line" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No investments yet</Text>
          <Text style={styles.emptySubtext}>
            Contact your administrator to start investing
          </Text>
        </View>
      )}
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
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  investmentCard: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
  },
  investmentHeader: {
    marginBottom: spacing.md,
  },
  investmentTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
  },
  investmentDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

