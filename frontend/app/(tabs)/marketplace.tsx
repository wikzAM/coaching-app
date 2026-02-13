import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback } from 'react';
import {
    ScrollView, Text, TouchableOpacity, View, StyleSheet,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
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

const ACCENTS = ['#7869B0', '#4C9F70', '#4A706E', '#D4AF37', '#C75B39'];

interface MarketplaceCoach {
    coach_id: string;
    name: string;
    training_model: string;
    personality: string;
    description: string;
    created_by: string;
}

export default function MarketplaceScreen() {
    const [marketCoaches, setMarketCoaches] = useState<MarketplaceCoach[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hiringId, setHiringId] = useState<string | null>(null);
    const { refreshCoaches, hasCoach } = useCoach();

    const fetchMarketplace = useCallback(async () => {
        try {
            // Edge function defaults action to 'browse' when no query param is present
            const { data, error } = await supabase.functions.invoke('marketplace');
            if (error) throw error;
            setMarketCoaches(data?.coaches || []);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to load marketplace');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMarketplace();
    }, [fetchMarketplace]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMarketplace();
    }, [fetchMarketplace]);

    const handleHire = async (coachId: string, coachName: string) => {
        Alert.alert(
            'Hire Coach',
            `Add ${coachName} to your team?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Hire',
                    onPress: async () => {
                        setHiringId(coachId);
                        try {
                            const { data, error } = await supabase.functions.invoke(
                                'marketplace?action=hire',
                                { body: { coach_id: coachId } }
                            );
                            if (error) throw error;

                            if (data?.already_hired) {
                                Alert.alert('Already Hired', `${coachName} is already on your team.`);
                            } else {
                                Alert.alert('Success', `${coachName} has been added to your coaches!`);
                                refreshCoaches();
                            }
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to hire coach');
                        } finally {
                            setHiringId(null);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.parchment }}>
                <ActivityIndicator size="large" color={C.lilac} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.parchment }}>
            <LinearGradient
                colors={[C.lilac, C.parchment, C.parchment, C.lilac]}
                locations={[0, 0.3, 0.7, 1]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0.7, y: 0 }}
                style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
            />

            <SafeAreaView style={{ flex: 1 }}>
                {/* ── HEADER ── */}
                <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
                    <Text style={{
                        fontSize: 28,
                        fontWeight: '900',
                        color: C.ink,
                        letterSpacing: -1.5,
                    }}>
                        Marketplace
                    </Text>
                    <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: C.pine,
                        marginTop: 4,
                    }}>
                        Discover and hire coaches built by the community
                    </Text>
                </View>

                {/* ── DIVIDER ── */}
                <View style={{ height: 1, backgroundColor: C.ink, marginHorizontal: 24, opacity: 0.1 }} />

                {/* ── COACH LIST ── */}
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lilac} />
                    }
                >
                    {marketCoaches.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingTop: 60 }}>
                            <Ionicons name="compass-outline" size={48} color={C.pine} style={{ opacity: 0.4 }} />
                            <Text style={{
                                fontSize: 16,
                                fontWeight: '800',
                                color: C.ink,
                                marginTop: 16,
                            }}>
                                No coaches available yet
                            </Text>
                            <Text style={{
                                fontSize: 13,
                                color: C.pine,
                                marginTop: 6,
                                textAlign: 'center',
                            }}>
                                Published coaches will appear here.{'\n'}Pull down to refresh.
                            </Text>
                        </View>
                    ) : (
                        marketCoaches.map((coach, index) => {
                            const accent = ACCENTS[index % ACCENTS.length];
                            const isHiring = hiringId === coach.coach_id;
                            const alreadyHired = hasCoach(coach.coach_id);

                            return (
                                <View
                                    key={coach.coach_id}
                                    style={{
                                        marginBottom: 16,
                                        borderRadius: 20,
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.6)',
                                    }}
                                >
                                    <BlurView
                                        intensity={60}
                                        tint="light"
                                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.4)' }]}
                                    />
                                    <View style={{ padding: 20 }}>
                                        {/* ── Coach Info Row ── */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                            <View style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 16,
                                                backgroundColor: accent,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 14,
                                            }}>
                                                <Text style={{ fontSize: 22 }}>🤖</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 17,
                                                    fontWeight: '900',
                                                    color: C.ink,
                                                    letterSpacing: -0.5,
                                                }}>
                                                    {coach.name}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                                    {coach.training_model ? (
                                                        <View style={{
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 2,
                                                            borderRadius: 6,
                                                            backgroundColor: `${accent}20`,
                                                        }}>
                                                            <Text style={{
                                                                fontSize: 10,
                                                                fontWeight: '800',
                                                                color: accent,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: 1,
                                                            }}>
                                                                {coach.training_model}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    {coach.personality ? (
                                                        <Text style={{
                                                            fontSize: 11,
                                                            fontWeight: '600',
                                                            color: C.pine,
                                                        }}>
                                                            {coach.personality}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                        </View>

                                        {/* ── Description ── */}
                                        {coach.description ? (
                                            <Text
                                                numberOfLines={2}
                                                style={{
                                                    fontSize: 13,
                                                    color: C.pine,
                                                    lineHeight: 19,
                                                    marginBottom: 14,
                                                }}
                                            >
                                                {coach.description}
                                            </Text>
                                        ) : null}

                                        {/* ── Hire / Already Hired Button ── */}
                                        {alreadyHired ? (
                                            <View style={{
                                                backgroundColor: `${C.shamrock}15`,
                                                paddingVertical: 12,
                                                borderRadius: 14,
                                                alignItems: 'center',
                                                flexDirection: 'row',
                                                justifyContent: 'center',
                                                gap: 8,
                                                borderWidth: 1,
                                                borderColor: `${C.shamrock}30`,
                                            }}>
                                                <Ionicons name="checkmark-circle" size={18} color={C.shamrock} />
                                                <Text style={{
                                                    fontSize: 13,
                                                    fontWeight: '800',
                                                    color: C.shamrock,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 1.5,
                                                }}>
                                                    Hired
                                                </Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => handleHire(coach.coach_id, coach.name)}
                                                disabled={isHiring}
                                                style={{
                                                    backgroundColor: C.ink,
                                                    paddingVertical: 12,
                                                    borderRadius: 14,
                                                    alignItems: 'center',
                                                    flexDirection: 'row',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    opacity: isHiring ? 0.6 : 1,
                                                }}
                                            >
                                                {isHiring ? (
                                                    <ActivityIndicator size="small" color={C.parchment} />
                                                ) : (
                                                    <>
                                                        <Ionicons name="add-circle-outline" size={18} color={C.parchment} />
                                                        <Text style={{
                                                            fontSize: 13,
                                                            fontWeight: '800',
                                                            color: C.parchment,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 1.5,
                                                        }}>
                                                            Hire Coach
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
