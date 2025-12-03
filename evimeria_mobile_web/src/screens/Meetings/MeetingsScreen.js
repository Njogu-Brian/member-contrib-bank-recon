import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing } from '../../theme';

export default function MeetingsScreen() {
  const { data: meetings, isLoading, refetch } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.MEETINGS);
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
        <Text style={styles.headerTitle}>Meetings</Text>
      </View>

      {meetings?.data?.length > 0 ? (
        meetings.data.map((meeting) => (
          <Card key={meeting.id} style={styles.meetingCard}>
            <Card.Content>
              <View style={styles.meetingHeader}>
                <Text style={styles.title}>{meeting.title}</Text>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    { backgroundColor: meeting.status === 'scheduled' ? theme.colors.primary + '20' : '#E5E7EB' }
                  ]}
                  textStyle={{ fontSize: 10 }}
                >
                  {meeting.status}
                </Chip>
              </View>
              
              {meeting.description && (
                <Text style={styles.description}>{meeting.description}</Text>
              )}
              
              <View style={styles.meetingDetails}>
                <View style={styles.detailRow}>
                  <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {new Date(meeting.meeting_date).toLocaleDateString()}
                  </Text>
                </View>
                
                {meeting.location && (
                  <View style={styles.detailRow}>
                    <Icon name="map-marker" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{meeting.location}</Text>
                  </View>
                )}
                
                {meeting.agenda && (
                  <View style={styles.agendaContainer}>
                    <Text style={styles.agendaTitle}>Agenda:</Text>
                    <Text style={styles.agendaText}>{meeting.agenda}</Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="calendar-blank" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No meetings scheduled</Text>
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
  meetingCard: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
  },
  meetingHeader: {
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
  statusChip: {
    height: 24,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  meetingDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  agendaContainer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 8,
  },
  agendaTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  agendaText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
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

