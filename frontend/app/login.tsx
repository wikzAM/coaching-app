import React, { useState, Suspense } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import GoogleIcon from '../components/google-icon';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

type AuthMethod = 'phone' | 'google' | 'email';

// Check if running in Expo Go (where Firebase native modules aren't available)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy load PhoneAuth only when not in Expo Go
const PhoneAuth = !isExpoGo
    ? React.lazy(() => import('../components/phone-auth'))
    : null;

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [authMethod, setAuthMethod] = useState<AuthMethod>(isExpoGo ? 'google' : 'phone');

    // Email auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    // ============ GOOGLE AUTH LOGIC ============
    const onGoogleLogin = async () => {
        setLoading(true);
        try {
            // Use the scheme from app.json for deep linking
            const redirectUrl = Linking.createURL('auth/callback');
            console.log('OAuth redirect URL:', redirectUrl);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });
            if (error) throw error;
            
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                console.log('WebBrowser result:', result);
                
                // Handle the result - extract tokens from URL if present
                if (result.type === 'success' && result.url) {
                    const url = new URL(result.url);
                    const params = new URLSearchParams(url.hash.slice(1)); // Remove # from hash
                    
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    
                    if (accessToken && refreshToken) {
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        if (sessionError) {
                            Alert.alert('Error', sessionError.message);
                        }
                    }
                }
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ============ EMAIL AUTH LOGIC ============
    const onEmailAuth = async () => {
        if (!email.trim() || !password.trim()) return;
        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                });
                if (error) throw error;
                Alert.alert('Check Email', 'Confirmation link sent.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ============ RENDER HELPERS ============
    const renderPhoneAuth = () => {
        if (!PhoneAuth) {
            return (
                <View className="w-full items-center py-8">
                    <Text className="text-gray-500 text-center">
                        Phone auth is not available in Expo Go.{'\n'}
                        Use a development build to enable phone login.
                    </Text>
                </View>
            );
        }
        return (
            <Suspense fallback={<ActivityIndicator size="large" color="#000" />}>
                <PhoneAuth loading={loading} setLoading={setLoading} />
            </Suspense>
        );
    };

    const renderGoogleAuth = () => (
        <View className="w-full">
            <Pressable onPress={onGoogleLogin} disabled={loading} className="flex-row items-center justify-center bg-black rounded-xl py-4 px-6 w-full shadow-md">
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                        <GoogleIcon width={24} height={24} />
                        <Text className="text-white font-bold text-lg ml-3">Continue with Google</Text>
                    </>
                )}
            </Pressable>
        </View>
    );

    const renderEmailAuth = () => (
        <View className="w-full">
            <Text className="text-sm text-gray-600 mb-2">Email</Text>
            <TextInput
                className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg mb-3 bg-white"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            <Text className="text-sm text-gray-600 mb-2">Password</Text>
            <TextInput
                className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg mb-4 bg-white"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Pressable onPress={onEmailAuth} disabled={loading} className="bg-black rounded-xl py-4 items-center mb-3">
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">{isSignUp ? 'Sign Up' : 'Sign In'}</Text>}
            </Pressable>
            <Pressable onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-gray-500 text-center">{isSignUp ? 'Switch to Login' : 'Switch to Sign Up'}</Text>
            </Pressable>
        </View>
    );

    // Available auth methods based on environment
    const availableMethods: AuthMethod[] = isExpoGo ? ['google', 'email'] : ['phone', 'google', 'email'];

    const renderTab = (method: AuthMethod) => {
        const isActive = authMethod === method;
        return (
            <Pressable
                key={method}
                onPress={() => setAuthMethod(method)}
                style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: isActive ? 'white' : 'transparent',
                    shadowColor: isActive ? '#000' : 'transparent',
                    shadowOpacity: isActive ? 0.1 : 0,
                    shadowRadius: isActive ? 2 : 0,
                }}
            >
                <Text
                    style={{
                        textAlign: 'center',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        color: isActive ? 'black' : '#6B7280',
                    }}
                >
                    {method}
                </Text>
            </Pressable>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">

                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome</Text>
                    <Text className="text-gray-500 text-center">Sign in to your AI Coach</Text>
                </View>

                {/* TABS */}
                <View style={{ flexDirection: 'row', marginBottom: 24, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, width: '100%' }}>
                    {availableMethods.map(renderTab)}
                </View>

                {/* CONTENT */}
                {authMethod === 'phone' && renderPhoneAuth()}
                {authMethod === 'google' && renderGoogleAuth()}
                {authMethod === 'email' && renderEmailAuth()}

            </ScrollView>
        </View>
    );
}
