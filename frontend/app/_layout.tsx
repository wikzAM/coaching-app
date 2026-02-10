import "../suppress-warnings"; // Must be first import
import "../global.css"; // Ensure global styles are imported
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '../lib/supabase';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { CoachProvider } from '@/lib/coach-context';

// Ensure AuthSession flow gets completed when the app opens after redirect
WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // 1. Auth Listener
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // Listen for changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Navigation Guard
  useEffect(() => {
    if (!initialized) return;

    // Check if the user is on the login screen or auth flow
    const isAuthRoute = segments[0] === 'login' || segments[0] === 'auth';

    // If NO session and NOT on auth route -> Redirect to Login
    if (!session && !isAuthRoute) {
      router.replace('/login');
    }
    // If YES session and IS on login screen -> Redirect to Tabs
    else if (session && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [session, initialized, segments]);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <View style={{ flex: 1 }} className={colorScheme === 'dark' ? 'dark' : ''}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <CoachProvider>
              <Stack>
                {/* Main App Navigation */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />

                {/* Chat Flow */}
                <Stack.Screen
                  name="chat/[id]"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />

                {/* Create Coach screen */}
                <Stack.Screen
                  name="create-coach"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />

                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Settings' }} />
              </Stack>
            </CoachProvider>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </View>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}