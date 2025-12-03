import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen.js';
import RegisterScreen from '../screens/Auth/RegisterScreen.js';
import MFAScreen from '../screens/Auth/MFAScreen.js';

// Main Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen.js';
import ContributionsScreen from '../screens/Contributions/ContributionsScreen.js';
import WalletScreen from '../screens/Wallet/WalletScreen.js';
import InvestmentsScreen from '../screens/Investments/InvestmentsScreen.js';
import ProfileScreen from '../screens/Profile/ProfileScreen.js';

// Additional Screens
import StatementScreen from '../screens/Wallet/StatementScreen.js';
import PaymentScreen from '../screens/Contributions/PaymentScreen.js';
import AnnouncementsScreen from '../screens/Announcements/AnnouncementsScreen.js';
import MeetingsScreen from '../screens/Meetings/MeetingsScreen.js';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Dashboard':
              iconName = 'view-dashboard';
              break;
            case 'Contributions':
              iconName = 'cash-multiple';
              break;
            case 'Wallet':
              iconName = 'wallet';
              break;
            case 'Investments':
              iconName = 'chart-line';
              break;
            case 'Profile':
              iconName = 'account';
              break;
            default:
              iconName = 'circle';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Contributions" component={ContributionsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Investments" component={InvestmentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="MFA" component={MFAScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Statement" component={StatementScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
          <Stack.Screen name="Meetings" component={MeetingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;

