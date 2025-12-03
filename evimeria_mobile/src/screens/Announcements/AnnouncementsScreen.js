import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing } from '../../theme';

export default function AnnouncementsScreen() {
  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ANNOUNCEMENTS);
      return response.data;
    },
  });

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
        <Text style={styles.headerTitle}>Announcements</Text>
      </View>

      {announcements?.data?.length > 0 ? (
        announcements.data.map((announcement) => (
          <Card key={announcement.id} style={styles.announcementCard}>
            <Card.Content>
              <View style={styles.announcementHeader}>
                <Text style={styles.title}>{announcement.title}</Text>
                {announcement.priority === 'high' && (
                  <Chip
                    mode="flat"
                    style={styles.priorityChip}
                    textStyle={{ fontSize: 10 }}
                  >
                    Important
                  </Chip>
                )}
              </View>
              
              <Text style={styles.content}>{announcement.content}</Text>
              
              <View style={styles.footer}>
                <Text style={styles.date}>
                  {new Date(announcement.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="bullhorn-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No announcements</Text>
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
  announcementCard: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  priorityChip: {
    backgroundColor: theme.colors.error + '20',
    height: 24,
  },
  content: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  date: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: spacing.md,
  },
});

