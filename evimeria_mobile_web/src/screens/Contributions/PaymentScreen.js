import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, Surface, RadioButton } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { theme, spacing, borderRadius } from '../../theme';

export default function PaymentScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(API_ENDPOINTS.MAKE_PAYMENT, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['wallet']);
      Alert.alert(
        'Payment Initiated',
        'Please check your phone for the MPESA prompt and enter your PIN to complete the payment.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error) => {
      Alert.alert(
        'Payment Failed',
        error.response?.data?.message || 'Failed to initiate payment'
      );
    },
  });

  const handlePayment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'mpesa' && !phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    paymentMutation.mutate({
      amount: parseFloat(amount),
      phone_number: phoneNumber,
      payment_method: paymentMethod,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text style={styles.title}>Make a Contribution</Text>
        <Text style={styles.subtitle}>Enter amount and payment details</Text>

        <TextInput
          label="Amount (KES)"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="currency-usd" />}
        />

        <View style={styles.paymentMethodContainer}>
          <Text style={styles.label}>Payment Method</Text>
          <RadioButton.Group
            onValueChange={value => setPaymentMethod(value)}
            value={paymentMethod}
          >
            <View style={styles.radioItem}>
              <RadioButton value="mpesa" />
              <Text>M-PESA</Text>
            </View>
          </RadioButton.Group>
        </View>

        {paymentMethod === 'mpesa' && (
          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            mode="outlined"
            keyboardType="phone-pad"
            placeholder="254712345678"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />
        )}

        <Button
          mode="contained"
          onPress={handlePayment}
          loading={paymentMutation.isPending}
          disabled={paymentMutation.isPending}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {paymentMutation.isPending ? 'Processing...' : 'Pay Now'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
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
  paymentMethodContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginTop: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});

