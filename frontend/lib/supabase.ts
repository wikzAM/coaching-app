import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = 'https://fayxjdvnrwcqdsfsorof.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheXhqZHZucndjcWRzZnNvcm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDg5NzUsImV4cCI6MjA4NTI4NDk3NX0.sGbQqJFgarT3pANPtd8wm1m0lQ6YaDKLN7pOrWO9pc8';


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        flowType: 'implicit',
        // Allow Supabase client to detect and parse session data from OAuth redirect URLs
        detectSessionInUrl: true,
    },
});

// Tells Supabase to stop refreshing the token if the app is closed (saves battery/data)
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
