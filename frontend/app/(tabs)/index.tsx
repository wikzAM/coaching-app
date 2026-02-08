import ArchedCarousel from '@/components/arched-carousel';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useCoach } from '@/lib/coach-context'; // <--- IMPORT HOOK

const StatItem = ({ label, value, hasBorder = true }: { label: string, value: string, hasBorder?: boolean }) => (
  <>
    <View className="flex-1 px-3.5">
      <Text className="text-[9px] uppercase tracking-[1.8px] text-secondary mb-0.5">{label}</Text>
      <Text className="text-[15px] font-extrabold text-foreground">{value}</Text>
    </View>
    {hasBorder && <View className="w-[1px] bg-foreground/20" />}
  </>
);

const Rule = ({ className = 'bg-foreground' }: { className?: string }) => (
  <View className={`h-[1px] w-full ${className}`} />
);

const CARD_WIDTH = 185;

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const primary = Colors[colorScheme].tint;

  // 1. Get data from the hook
  const { coaches, isLoading } = useCoach();

  // 2. Merge "Create New" card with real coach data
  const CAROUSEL_DATA = [{ id: 'new', type: 'create' }, ...coaches];

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={[primary, 'transparent', 'transparent', primary]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: .7, y: .2 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
      />

      <SafeAreaView className="flex-1" style={{ overflow: 'visible' }}>
        {/* Header */}
        <View className="px-6 pt-5">
          <View className="flex-row items-center justify-around mb-6">
            <View className="items-center">
              <Ionicons name="flame" size={22} className="text-primary" />
              <Text className="text-[13px] font-bold text-foreground">87</Text>
            </View>
            <Text className="text-[35px] font-black -tracking-[3px] text-foreground">COACHAI</Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={22} className="text-foreground" />
              <View className="absolute -top-0.5 -right-0.5 w-[9px] h-[9px] rounded-full bg-primary border-[1.5px] border-background" />
            </TouchableOpacity>
          </View>

          <View className="flex-row py-3 pb-4 items-stretch">
            {/* 3. Use dynamic length for stats */}
            <StatItem label="Coaches" value={coaches.length.toString()} />
            <StatItem label="Sessions" value="155" />
            <StatItem label="This Week" value="12" hasBorder={false} />
          </View>
          <Rule className="bg-foreground/10" />
        </View>

        {/* Stories Rail */}
        <View className="pt-8 pb-8">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            <TouchableOpacity className="mr-5 items-center">
              <View className="w-[68px] h-[68px] rounded-full border-[2px] border-dashed border-secondary justify-center items-center mb-1.5 bg-surface">
                <View className="w-[58px] h-[58px] rounded-full bg-background border border-secondary justify-center items-center">
                  <Ionicons name="add" size={24} className="text-secondary" />
                </View>
              </View>
              <Text className="text-[10px] font-bold text-secondary tracking-widest uppercase">Daily</Text>
            </TouchableOpacity>

            {/* 4. Map over real coaches data */}
            {coaches.map((coach) => (
              <TouchableOpacity
                key={coach.id}
                className="mr-5 items-center"
                onPress={() => router.push({
                    pathname: "/chat/[id]",
                    params: { id: coach.id.toString(), name: coach.name }
                })}
              >
                <View className={`w-[68px] h-[68px] rounded-full justify-center items-center mb-1.5 border-[2px] ${coach.hasReminder ? 'border-primary' : 'border-foreground/10'} bg-surface`}>
                  <View className="w-[58px] h-[58px] rounded-full bg-foreground justify-center items-center border-[2px] border-background">
                    <Text className="text-xl font-black text-background">{coach.avatar}</Text>
                  </View>
                  {coach.hasReminder && (
                    <View className="absolute bottom-0 right-0 bg-primary w-5 h-5 rounded-full border-[2px] border-background justify-center items-center">
                      <Ionicons name="flash" size={10} className="text-background" />
                    </View>
                  )}
                </View>
                <Text className={`text-[10px] font-bold tracking-widest uppercase ${coach.hasReminder ? 'text-foreground' : 'text-secondary'}`}>
                  {coach.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex-1" />

        {/* Carousel */}
        <View className="justify-end" style={{ overflow: 'visible', paddingBottom: 12 }}>
          <ArchedCarousel
            data={CAROUSEL_DATA}
            initialIndex={1}
            bend={20}
            cardWidth={CARD_WIDTH}
            cardSpacing={33}
            renderItem={(item: any) => {
              if (item.type === 'create') {
                return (
                  <TouchableOpacity 
                    className="border-2 border-dashed border-secondary rounded-3xl justify-center items-center bg-surface" 
                    style={{ width: CARD_WIDTH, height: 260 }}
                    onPress={() => router.push('/create-coach')} 
                  >
                    <View className="w-11 h-11 rounded-full border-[1.5px] border-secondary justify-center items-center mb-2.5">
                      <Ionicons name="add" size={22} className="text-secondary" />
                    </View>
                    <Text className="text-[9px] uppercase tracking-[2px] text-secondary font-semibold">New Coach</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={{ width: CARD_WIDTH, height: 260 }}
                  onPress={() => router.push({
                    pathname: "/chat/[id]",
                    params: { id: item.id.toString(), name: item.name }
                  })}
                >
                  <View className="flex-1 rounded-3xl overflow-hidden border-[2px] border-white/60 shadow-2xl shadow-black/20">
                    <BlurView intensity={80} tint="default" style={StyleSheet.absoluteFill} />
                    <View className="flex-1 bg-surface border-[2px] rounded-3xl border-border-subtle">
                      <View className="flex-row items-center justify-between px-3.5 py-3 border-b border-foreground/5 bg-background/10">
                        <Text className={`text-[10px] uppercase tracking-[2px] font-black ${item.textAccent}`}>
                          {item.specialty}
                        </Text>
                        {item.unread > 0 && (
                          <View className={`${item.accent} rounded-full w-5 h-5 justify-center items-center`}>
                            <Text className="text-[10px] font-black text-background">{item.unread}</Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-1 p-3.5 justify-between">
                        <View>
                          <Text className="text-[80px] font-black leading-[72px] text-foreground opacity-[0.08] -mt-1">{item.avatar}</Text>
                          <Text className="text-2xl font-black text-foreground -mt-[18px] -tracking-[1.5px] leading-6">{item.name}</Text>
                        </View>
                        <View>
                          <Rule className="bg-foreground/10" />
                          <View className="flex-row justify-between mt-3">
                            <View>
                              <Text className="text-[9px] uppercase tracking-[1.5px] text-secondary font-bold">Sessions</Text>
                              <Text className="text-sm font-black text-foreground">{item.sessions}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[9px] uppercase tracking-[1.5px] text-secondary font-bold">Streak</Text>
                              <View className="flex-row items-center gap-1">
                                <Ionicons name="flame" size={13} color={item.hex} />
                                <Text className="text-sm font-black text-foreground">{item.streak}d</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* View All */}
        <View className="px-6 pb-4 pt-4 items-center">
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => router.push('/coachlist')}
          >
            <Text className="text-[12px] font-bold text-primary uppercase tracking-[2px]">View All</Text>
            <Ionicons name="arrow-forward" size={12} className="text-primary" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}