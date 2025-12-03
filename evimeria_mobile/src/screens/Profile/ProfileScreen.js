import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, List, Button, Divider } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { theme, spacing } from '../../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Card style={styles.card}>
        <List.Section>
          <List.Item
            title="Phone"
            description={user?.phone || 'Not set'}
            left={props => <List.Icon {...props} icon="phone" />}
          />
          <Divider />
          <List.Item
            title="Member Code"
            description={user?.member?.member_code || 'Not assigned'}
            left={props => <List.Icon {...props} icon="card-account-details" />}
          />
          <Divider />
          <List.Item
            title="Status"
            description={user?.is_active ? 'Active' : 'Inactive'}
            left={props => <List.Icon {...props} icon="check-circle" />}
          />
        </List.Section>
      </Card>

      <Card style={styles.card}>
        <List.Section>
          <List.Item
            title="Settings"
            left={props => <List.Icon {...props} icon="cog" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Help & Support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="About"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>
      </Card>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor={theme.colors.error}
        icon="logout"
      >
        Logout
      </Button>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  email: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
  },
  logoutButton: {
    margin: spacing.md,
    marginTop: spacing.lg,
  },
  version: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

