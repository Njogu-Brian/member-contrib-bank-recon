import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, FAB } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing } from '../../theme';

export default function ContributionsScreen({ navigation }) {
  const { data: contributions, isLoading, refetch } = useQuery({
    queryKey: ['contributions'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CONTRIBUTIONS);
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
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contributions</Text>
          <Text style={styles.headerSubtitle}>Track your contributions</Text>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Expected</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(contributions?.expected)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Contributed</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                  {formatCurrency(contributions?.actual)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Contribution History</Text>
          
          {contributions?.history?.length > 0 ? (
            contributions.history.map((item, index) => (
              <Card key={index} style={styles.contributionCard}>
                <Card.Content>
                  <View style={styles.contributionHeader}>
                    <Text style={styles.contributionDate}>
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.contributionAmount}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                  <Text style={styles.contributionType}>{item.type}</Text>
                  {item.reference && (
                    <Text style={styles.contributionReference}>
                      Ref: {item.reference}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>No contributions yet</Text>
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Payment')}
        label="Make Payment"
      />
    </View>
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
    fontSize: 20,
    fontWeight: 'bold',
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
  contributionCard: {
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  contributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  contributionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  contributionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  contributionType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  contributionReference: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: spacing.xl,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});

