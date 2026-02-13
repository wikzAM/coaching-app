import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Switch, Alert } from 'react-native';
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
    gold: '#D4AF37',
};

const Rule = ({ colorClass = 'bg-ink' }: { colorClass?: string }) => (
    <View className={`h-[1px] w-full ${colorClass}`} />
);

// ── REUSABLE GLASS MENU ITEM ──
const MenuItem = ({ icon, label, value, isToggle = false, onPress }: any) => (
    <TouchableOpacity activeOpacity={0.7} className="mb-3" onPress={onPress}>
        <View
            className="flex-row items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60"
            style={{ borderColor: 'rgba(2, 9, 18, 0.05)' }}
        >
            <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-parchment justify-center items-center border border-ink/5">
                    <Ionicons name={icon} size={16} color={C.pine} />
                </View>
                <Text className="text-sm font-bold text-ink">{label}</Text>
            </View>

            {isToggle ? (
                <Switch
                    value={true}
                    trackColor={{ false: '#e0e0e0', true: C.lilac }}
                    thumbColor={C.parchment}
                    ios_backgroundColor="#e0e0e0"
                    style={{ transform: [{ scale: 0.8 }] }}
                />
            ) : (
                <View className="flex-row items-center gap-2">
                    {value && <Text className="text-xs font-bold text-ink/40">{value}</Text>}
                    <Ionicons name="chevron-forward" size={16} color={C.ink} opacity={0.3} />
                </View>
            )}
        </View>
    </TouchableOpacity>
);

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
                        <View className="relative shadow-lilac/50">
                            <View
                                className="w-28 shadow-2xl h-28 rounded-full border-[3px] border-parchment justify-center items-center overflow-hidden"
                                style={{ backgroundColor: C.ink }}
                            >
                                <Text className="text-5xl font-black text-parchment mt-1">{userName[0]}</Text>
                            </View>
                            <TouchableOpacity className="absolute bottom-0 right-0 bg-lilac w-8 h-8 rounded-full border-[3px] border-parchment justify-center items-center">
                                <Ionicons name="pencil" size={14} color={C.parchment} />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-2xl font-black text-ink mt-4 -tracking-[1px]">{userName}</Text>
                        <Text className="text-xs font-bold text-pine uppercase tracking-widest mt-1">Member</Text>
                    </View>

                    {/* ── STATS GRID (Glassmorphic) ── */}
                    <View className="px-6 mb-8">
                        <View className="rounded-3xl overflow-hidden border border-white/60
                         relative shadow-sm">
                            <BlurView
                                intensity={80}
                                tint="light"
                                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.5)' }]}
                            />
                            <View className="flex-row p-5 justify-between items-center divide-x divide-ink/5">
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-black text-ink">{coaches.length}</Text>
                                    <Text className="text-[9px] font-bold text-pine uppercase tracking-widest mt-1">Coaches</Text>
                                </View>
                                <View className="items-center flex-1">
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="flame" size={20} color={C.lilac} />
                                        <Text className="text-2xl font-black text-ink">0</Text>
                                    </View>
                                    <Text className="text-[9px] font-bold text-pine uppercase tracking-widest mt-1">Day Streak</Text>
                                </View>
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-black text-ink">0</Text>
                                    <Text className="text-[9px] font-bold text-pine uppercase tracking-widest mt-1">Sessions</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── MENU SECTIONS ── */}
                    <View className="px-6">
                        <Text className="text-[10px] font-black text-ink/30 uppercase tracking-[2px] mb-3 ml-2">Account</Text>
                        <MenuItem icon="person-outline" label="Personal Details" />
                        <MenuItem icon="wallet-outline" label="Subscription" value="Free Plan" />
                        <MenuItem icon="notifications-outline" label="Notifications" isToggle />

                        <Text className="text-[10px] font-black text-ink/30 uppercase tracking-[2px] mb-3 mt-4 ml-2">Preferences</Text>
                        <MenuItem icon="color-palette-outline" label="Theme" value="System" />
                        <MenuItem icon="globe-outline" label="Language" value="English" />

                        <Text className="text-[10px] font-black text-ink/30 uppercase tracking-[2px] mb-3 mt-4 ml-2">Support</Text>
                        <MenuItem icon="help-buoy-outline" label="Help Center" />
                        <MenuItem icon="log-out-outline" label="Log Out" onPress={handleSignOut} />
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