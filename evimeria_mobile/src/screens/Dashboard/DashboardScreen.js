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
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.DASHBOARD);
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

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Surface style={[styles.statCard, { borderLeftColor: color }]} elevation={2}>
        <View style={styles.statContent}>
          <View style={styles.statTextContainer}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
          <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
            <Icon name={icon} size={32} color={color} />
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

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
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}! 👋</Text>
        <Text style={styles.subtitle}>Welcome to Evimeria Portal</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="My Balance"
          value={formatCurrency(dashboard?.wallet?.balance)}
          icon="wallet"
          color={theme.colors.primary}
          onPress={() => navigation.navigate('Wallet')}
        />
        
        <StatCard
          title="Expected"
          value={formatCurrency(dashboard?.expected_contributions)}
          icon="target"
          color={theme.colors.warning}
        />
        
        <StatCard
          title="Contributed"
          value={formatCurrency(dashboard?.total_contributions)}
          icon="cash-check"
          color={theme.colors.success}
        />
        
        <StatCard
          title="Investments"
          value={formatCurrency(dashboard?.total_investments)}
          icon="chart-line"
          color={theme.colors.secondary}
          onPress={() => navigation.navigate('Investments')}
        />
      </View>

      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Contribution Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: dashboard?.status_color || '#6B7280' }]}>
              <Text style={styles.statusBadgeText}>
                {dashboard?.status_label || 'Unknown'}
              </Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (dashboard?.contribution_percentage || 0))}%`,
                    backgroundColor: dashboard?.status_color || theme.colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {dashboard?.contribution_percentage?.toFixed(1) || 0}% Complete
            </Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Payment')}
          >
            <Icon name="cash-plus" size={32} color={theme.colors.primary} />
            <Text style={styles.actionText}>Make Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Statement')}
          >
            <Icon name="file-document" size={32} color={theme.colors.secondary} />
            <Text style={styles.actionText}>View Statement</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Announcements')}
          >
            <Icon name="bullhorn" size={32} color={theme.colors.warning} />
            <Text style={styles.actionText}>Announcements</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Meetings')}
          >
            <Icon name="calendar-account" size={32} color={theme.colors.success} />
            <Text style={styles.actionText}>Meetings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {dashboard?.recent_transactions?.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {dashboard.recent_transactions.slice(0, 5).map((transaction, index) => (
            <Surface key={index} style={styles.transactionItem} elevation={1}>
              <View style={styles.transactionContent}>
                <View style={styles.transactionIcon}>
                  <Icon name="arrow-down" size={20} color={theme.colors.success} />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionTitle}>Contribution</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            </Surface>
          ))}
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    margin: spacing.md,
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  quickActions: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    elevation: 2,
  },
  actionText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
  },
  recentSection: {
    padding: spacing.md,
  },
  transactionItem: {
    marginBottom: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
  },
  footer: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});

