import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import MFAScreen from '../screens/Auth/MFAScreen';

// Main Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ContributionsScreen from '../screens/Contributions/ContributionsScreen';
import WalletScreen from '../screens/Wallet/WalletScreen';
import InvestmentsScreen from '../screens/Investments/InvestmentsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Additional Screens
import StatementScreen from '../screens/Wallet/StatementScreen';
import PaymentScreen from '../screens/Contributions/PaymentScreen';
import AnnouncementsScreen from '../screens/Announcements/AnnouncementsScreen';
import MeetingsScreen from '../screens/Meetings/MeetingsScreen';

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

