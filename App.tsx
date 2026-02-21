import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { A0PurchaseProvider } from 'a0-purchases';

import LoginScreen from "./screens/LoginScreen"
import HomeScreen from "./screens/HomeScreen"
import AdminDashboard from "./screens/admin/AdminDashboard"
import ManagerDashboard from "./screens/ManagerDashboard"
import PolicyChatScreen from "./screens/PolicyChatScreen"
import QuizScreen from "./screens/QuizScreen"
import ComplianceScreen from "./screens/ComplianceScreen"
import WellnessChatScreen from "./screens/WellnessChatScreen"
import ConflictResolutionScreen from "./screens/ConflictResolutionScreen"
import DocumentUploadScreen from "./screens/DocumentUploadScreen"

import { AuthProvider, useAuth } from './lib/auth-context';
import { colors } from './lib/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function EmployeeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={PolicyChatScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="chat" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wellness"
        component={WellnessChatScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="spa" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Resolve"
        component={ConflictResolutionScreen}
        options={{
          tabBarLabel: 'Conflicts',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="handshake" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="quiz" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Compliance"
        component={ComplianceScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="check-circle" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ManagerDashboard}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={PolicyChatScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="chat" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Resolve"
        component={ConflictResolutionScreen}
        options={{
          tabBarLabel: 'Conflicts',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="handshake" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="quiz" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="admin-panel-settings" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={PolicyChatScreen}
        options={{
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="chat" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootStack() {
  const { user, loading, restoreUser } = useAuth();

  useEffect(() => {
    restoreUser();
  }, [restoreUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.role === 'admin' ? (
        <>
          <Stack.Screen name="AdminApp" component={AdminTabs} />
        </>
      ) : user.role === 'manager' ? (
        <>
          <Stack.Screen name="ManagerApp" component={ManagerTabs} />
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
        </>
      ) : (
        <Stack.Screen name="EmployeeApp" component={EmployeeTabs} />
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const { user } = useAuth();
  
  return (
    <A0PurchaseProvider config={{
      appUserId: user?.userId,
      debug: __DEV__,
    }}>
      <RootStack />
    </A0PurchaseProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <AuthProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});