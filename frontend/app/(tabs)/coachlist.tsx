import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase'; // Ensure this path matches your project structure

// Define the shape of a Coach from Supabase
interface Coach {
  coach_id: string;
  name: string | null;
  description: string | null;
  // We add these locally for UI styling
  avatar: string;
  accent: string;
  specialty: string;
}

const SNAPPY_SPRING = {
  stiffness: 600,
  damping: 35,
  mass: 0.5,
};

// Accents to cycle through for visual variety
const ACCENTS = ['bg-primary', 'bg-success', 'bg-secondary'];

export default function CoachListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const primaryColor = Colors[colorScheme].tint;
  
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*');

      if (error) {
        console.error('Error fetching coaches:', error);
      } else if (data) {
        // Map Supabase data to UI required format
        const formattedCoaches = data.map((coach: any, index: number) => ({
          ...coach,
          // If name is missing, fallback to 'Coach'
          name: coach.name || 'Coach', 
          // Use first letter of name for avatar
          avatar: (coach.name || 'C').charAt(0).toUpperCase(),
          // Assign a random color from our list
          accent: ACCENTS[index % ACCENTS.length],
          // Use description as specialty, truncate if too long
          specialty: coach.description ? 
            (coach.description.length > 20 ? coach.description.substring(0, 20) + '...' : coach.description) 
            : 'General Coaching'
        }));
        setCoaches(formattedCoaches);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderCoachItem = useCallback(({ item }: { item: Coach }) => (
    <Animated.View
      entering={FadeInDown.springify().stiffness(SNAPPY_SPRING.stiffness).damping(SNAPPY_SPRING.damping)}
      layout={Layout.springify().stiffness(SNAPPY_SPRING.stiffness)}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        className="mb-4 mx-6"
        onPress={() => router.push({
          pathname: "/chat/[id]",
          // Pass the actual UUID from Supabase
          params: { id: item.coach_id, name: item.name ?? "Coach" } 
        })}
      >
        <View className="rounded-[28px] overflow-hidden border-[2px] border-white/60 shadow-xl">
          <BlurView intensity={80} tint="default" style={StyleSheet.absoluteFill} />

          <View className="bg-surface/90 flex-row items-center p-4 border-[2px] border-border-subtle rounded-[26px]">
            <View className={`w-14 h-14 rounded-full ${item.accent} justify-center items-center shadow-lg border-[2px] border-white/20`}>
              <Text className="text-xl font-black text-background">{item.avatar}</Text>
            </View>

            <View className="flex-1 ml-4 justify-center">
              <Text className="text-[18px] font-black text-foreground -tracking-[1px] leading-tight">
                {item.name?.toUpperCase()}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-success shadow-sm" />
                <Text className="text-[10px] font-black text-secondary uppercase tracking-[2px]">
                  {item.specialty}
                </Text>
              </View>
            </View>

            {/* Unread badge removed since we don't have unread count in DB yet */}
            <Ionicons name="chevron-forward" size={20} className="text-foreground/20" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [router]);

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={[primaryColor, 'transparent', 'transparent', primaryColor]}
        locations={[0, 0.3, 0.9, 1]}
        style={[styles.absoluteFill, { opacity: 0.6 }]}
      />

      <SafeAreaView className="flex-1">
        <View className="px-6 pt-5 pb-8 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center border-[2px] border-foreground/10 shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} className="text-foreground" />
          </TouchableOpacity>

          <Text className="text-[32px] font-black -tracking-[2.5px] text-foreground">
            MY COACHES
          </Text>

          {/* Refresh Button */}
          <TouchableOpacity 
            onPress={fetchCoaches}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center border-[2px] border-foreground/10 shadow-sm"
          >
             <Ionicons name="refresh" size={20} className="text-foreground" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : (
          <FlatList
            data={coaches}
            keyExtractor={item => item.coach_id}
            renderItem={renderCoachItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <Text className="text-center text-foreground/50 mt-10">No coaches found. Check your database!</Text>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
});