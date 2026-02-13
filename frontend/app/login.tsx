import React, { useState, Suspense } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import GoogleIcon from '../components/google-icon';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Colors } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();
type AuthMethod = 'phone' | 'google' | 'email';

// Check if running in Expo Go (where Firebase native modules aren't available)
const isExpoGo = Constants.appOwnership === 'expo';

// Fallback when phone-auth fails to load (e.g. Firebase native module not in build)
const PhoneAuthUnavailable = () => (
    <View className="w-full items-center py-8">
        <Text className="text-gray-500 text-center">
            Phone auth is not available in this build.{'\n'}
            Use Google or Email to sign in.
        </Text>
    </View>
);

// Lazy load PhoneAuth only when not in Expo Go; fallback if Firebase native is missing
const PhoneAuth = !isExpoGo
    ? React.lazy(() =>
          import('../components/phone-auth').catch(() => ({ default: PhoneAuthUnavailable }))
      )
    : null;

// Move styles above component to avoid 'used before assignment' error
export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [authMethod, setAuthMethod] = useState<AuthMethod>(isExpoGo ? 'google' : 'phone');

    // Email auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const colorScheme = useColorScheme() ?? 'light';
    const primaryColor = Colors[colorScheme].tint;

    // ============ GOOGLE AUTH LOGIC ============
    const onGoogleLogin = async () => {
        setLoading(true);
        try {
            // Use custom scheme for standalone, Expo URL for Expo Go
            let redirectUrl;
            if (Constants.appOwnership === 'expo') {
                // Expo Go: use Linking.createURL
                redirectUrl = Linking.createURL('auth/callback');
            } else {
                // Standalone: use scheme from app.json ("coachingapp")
                redirectUrl = 'coachingapp://auth/callback';
            }
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
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                });
                if (error) throw error;
                // If session exists, user is logged in (confirmations disabled)
                // If no session, confirmations are enabled - try signing in directly
                if (!data.session) {
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: email.trim(),
                        password: password,
                    });
                    if (signInError) {
                        Alert.alert('Check Email', 'Please confirm your email, then sign in.');
                    }
                }
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

    // Apple sign-in button removed (requires paid Apple Developer account)

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

        // ── HERO/BRANDING ──
        const renderHero = () => (
            <Animated.View entering={FadeInDown.springify()} className="items-center mb-8">
                <View className="w-24 h-24 rounded-full bg-primary/90 border-[4px] border-white/80 shadow-2xl shadow-black/20 items-center justify-center mb-4">
                    <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-6xl font-black text-white">🦩</Animated.Text>
                </View>
                <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-4xl font-black text-primary mb-2 tracking-tight">Welcome to Doffy</Animated.Text>
                <Animated.Text entering={FadeInDown.delay(300).springify()} className="text-secondary text-center text-base font-semibold max-w-[260px]">Your playful AI coach for growth, wellness, and fun. Sign in to begin your journey!</Animated.Text>
            </Animated.View>
        );

        return (
            <View className="flex-1 bg-background">
                {/* Animated Gradient Background */}
                <LinearGradient
                    colors={[primaryColor, 'transparent', primaryColor]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
                {/* Glassmorphic Blur Card */}
                <View className="flex-1 items-center justify-center px-2">
                    <BlurView intensity={80} tint={colorScheme} style={styles.glassCard}>
                        <ScrollView
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, minWidth: 320, maxWidth: 400 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {renderHero()}
                            {/* TABS */}
                            <View className="flex-row mb-6 bg-background/60 rounded-2xl p-1 w-full shadow-md shadow-black/10 border border-border-subtle">
                                {availableMethods.map(renderTab)}
                            </View>
                            {/* CONTENT */}
                            {authMethod === 'phone' && renderPhoneAuth()}
                            {authMethod === 'google' && renderGoogleAuth()}
                            {authMethod === 'email' && renderEmailAuth()}
                        </ScrollView>
                    </BlurView>
                </View>
            </View>
        );

}

// Glassmorphic card style
const styles = StyleSheet.create({
    glassCard: {
        marginTop: Platform.OS === 'web' ? 48 : 0,
        marginBottom: Platform.OS === 'web' ? 48 : 0,
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#7869B0',
        shadowOpacity: 0.15,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 8 },
        minHeight: 520,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 420,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
});
