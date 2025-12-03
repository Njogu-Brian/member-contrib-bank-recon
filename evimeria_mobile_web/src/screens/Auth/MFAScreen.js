import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { theme, spacing, borderRadius } from '../../theme';

export default function MFAScreen({ route, navigation }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyMFA } = useAuth();

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verifyMFA(email, code);
    } catch (error) {
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app
        </Text>

        <TextInput
          label="Verification Code"
          value={code}
          onChangeText={setCode}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Verify
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Back to Login
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    marginTop: spacing.md,
  },
});

