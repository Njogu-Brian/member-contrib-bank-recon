import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { theme, spacing, borderRadius } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      Alert.alert('Success', 'Registration successful! Please wait for admin approval.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Evimeria Initiative</Text>
      </View>

      <Surface style={styles.formContainer} elevation={2}>
        <TextInput
          label="Full Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({...formData, name: text})}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Email *"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData({...formData, phone: text})}
          mode="outlined"
          keyboardType="phone-pad"
          placeholder="254712345678"
          style={styles.input}
        />

        <TextInput
          label="Password *"
          value={formData.password}
          onChangeText={(text) => setFormData({...formData, password: text})}
          mode="outlined"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />

        <TextInput
          label="Confirm Password *"
          value={formData.password_confirmation}
          onChangeText={(text) => setFormData({...formData, password_confirmation: text})}
          mode="outlined"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.passwordHint}>
          Password must contain uppercase, lowercase, number, and special character
        </Text>

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Register
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginButton}
        >
          Already have an account? Sign In
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  formContainer: {
    padding: spacing.lg,
    borderRadius: 12,
  },
  input: {
    marginBottom: spacing.md,
  },
  passwordHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.md,
  },
});

