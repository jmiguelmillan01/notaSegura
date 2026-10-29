import React, { useState, useEffect } from 'react';
import { Tabs, Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { OnboardingModal } from '../../components/OnboardingModal';

export default function TabLayout() {
  const { profile } = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Si no tiene nombre definido en el perfil, mostrar Onboarding
    if (profile && !profile.full_name) {
      setShowOnboarding(true);
    }
  }, [profile]);

  return (
    <>
      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4F46E5', // Indigo primario
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: '#111827',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color as string} />
            ),
            headerRight: () => (
              <Link href="/modal" asChild>
                <Pressable style={styles.headerButton}>
                  <Ionicons name="information-circle-outline" size={24} color="#4F46E5" />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="subjects"
          options={{
            title: 'Calculadora',
            headerTitle: 'Calculadora y Notas',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'calculator' : 'calculator-outline'} size={24} color={color as string} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tareas & Bitácora',
            headerTitle: 'Tareas y Bitácora',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color as string} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            headerTitle: 'Mi Cuenta y Perfil',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color as string} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
});
