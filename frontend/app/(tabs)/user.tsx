import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useCoach } from '@/lib/coach-context';

// ── DESIGN CONSTANTS ──
const C = {
    parchment: '#F9F6F1',
    ink: '#020912',
    lilac: '#7869B0',
    shamrock: '#4C9F70',
    pine: '#4A706E',
};

export default function UserScreen() {
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('User');
    const [userEmail, setUserEmail] = useState('');
    const { coaches } = useCoach();

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const name = session.user.user_metadata?.full_name
                    || session.user.user_metadata?.name
                    || session.user.email?.split('@')[0]
                    || 'User';
                setUserName(name);
                setUserEmail(session.user.email || '');
            }
        };
        getUser();
    }, []);

    const handleSignOut = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            Alert.alert('Signed Out', 'You have been signed out.');
            // Optionally, navigate to login or reset user state here
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1">
            {/* ── BACKGROUND ── */}
            <LinearGradient
                colors={[C.lilac, '#F9F6F1', '#F9F6F1', C.lilac]}
                locations={[0, 0.3, 0.7, 1]}
                start={{ x: 0, y: 1 }}
                end={{ x: .7, y: 0 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.6 }}
            />
            <View className="absolute inset-0 bg-parchment -z-10" />

            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                    {/* ── HEADER PROFILE ── */}
                    <View className="px-6 pt-6 pb-6 items-center">
                        <View
                            className="w-28 shadow-2xl h-28 rounded-full border-[3px] border-parchment justify-center items-center overflow-hidden"
                            style={{ backgroundColor: C.ink }}
                        >
                            <Text className="text-5xl font-black text-parchment mt-1">{userName[0]}</Text>
                        </View>

                        <Text className="text-2xl font-black text-ink mt-4 -tracking-[1px]">{userName}</Text>
                        {userEmail ? (
                            <Text className="text-xs font-bold text-pine mt-1">{userEmail}</Text>
                        ) : (
                            <Text className="text-xs font-bold text-pine uppercase tracking-widest mt-1">Member</Text>
                        )}
                    </View>

                    {/* ── STATS (Glassmorphic) ── */}
                    <View className="px-6 mb-8">
                        <View className="rounded-3xl overflow-hidden border border-white/60 relative shadow-sm">
                            <BlurView
                                intensity={80}
                                tint="light"
                                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.5)' }]}
                            />
                            <View className="p-5 items-center">
                                <Text className="text-2xl font-black text-ink">{coaches.length}</Text>
                                <Text className="text-[9px] font-bold text-pine uppercase tracking-widest mt-1">Coaches</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── ACCOUNT ── */}
                    <View className="px-6">
                        <Text className="text-[10px] font-black text-ink/30 uppercase tracking-[2px] mb-3 ml-2">Account</Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="mb-3"
                            onPress={handleSignOut}
                            disabled={loading}
                        >
                            <View
                                className="flex-row items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60"
                                style={{ borderColor: 'rgba(2, 9, 18, 0.05)', opacity: loading ? 0.5 : 1 }}
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className="w-8 h-8 rounded-full bg-parchment justify-center items-center border border-ink/5">
                                        <Ionicons name="log-out-outline" size={16} color={C.pine} />
                                    </View>
                                    <Text className="text-sm font-bold text-ink">
                                        {loading ? 'Signing Out...' : 'Log Out'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={C.ink} opacity={0.3} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── Footer Version ── */}
                    <View className="items-center mt-8 opacity-30">
                        <Text className="text-[10px] font-bold text-ink">Doffy v1.0.0</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}