import ArchedCarousel from '@/components/arched-carousel';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useCoach } from '@/lib/coach-context';
import { supabase } from '@/lib/supabase'; // <--- Added Import

// --- CONFIG ---
const BASE_EMOJI = '🤖'; 
const CARD_WIDTH = 185;

// --- COMPONENTS ---
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

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const primary = Colors[colorScheme].tint;

  // 1. Get real data
  const { coaches, isLoading } = useCoach();

  // 2. Prepare Carousel Data
  const CAROUSEL_DATA = [{ id: 'new', type: 'create' }, ...coaches];

  // --- ACTIONS ---

  // Skeleton function for RevenueCat Purchase
  const handlePurchasePremium = async () => {
    console.log("Initiating Purchase Flow...");
    
    // --- REVENUECAT SKELETON CODE ---
    /*
    try {
      // 1. Import RevenueCat (make sure to install react-native-purchases)
      // import Purchases from 'react-native-purchases';

      // 2. Fetch Offerings
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        // Select the package (e.g., Monthly)
        const packageToBuy = offerings.current.availablePackages[0];
        
        // 3. Purchase
        const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
        
        // 4. Verify Entitlement (replace 'pro' with your actual identifier)
        if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
           Alert.alert("Success", "You are now a Premium member!");
           // Optionally navigate immediately:
           router.push('/create-coach');
        }
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase Error", e.message);
      }
    }
    */

    // MOCK RESPONSE FOR NOW
    Alert.alert("Premium Mock", "RevenueCat SDK purchase flow would trigger here.");
  };

  const handleCreatePress = async () => {
    // 1. Check Limit via Supabase RPC
    const { data: isLimitReached, error } = await supabase.rpc('check_limit_reached');

    if (error) {
      console.error(error);
      Alert.alert("Error", "Could not verify account limits. Please try again.");
      return;
    }

    // 2. Handle Result
    if (isLimitReached) {
      Alert.alert(
        "Limit Reached",
        "You have reached the maximum number of coaches allowed on the free plan.",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          { 
            text: "Get Premium", 
            style: "default", 
            onPress: handlePurchasePremium // <--- Triggers the payment flow
          }
        ]
      );
    } else {
      // 3. Proceed if limit not reached
      router.push('/create-coach');
    }
  };

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
              <Text className="text-[13px] font-bold text-foreground">0</Text>
            </View>
            <Text className="text-[35px] font-black -tracking-[3px] text-foreground">COACHAI</Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={22} className="text-foreground" />
            </TouchableOpacity>
          </View>

          {/* Header Stats - Keeping generic for now */}
          <View className="flex-row py-3 pb-4 items-stretch">
            <StatItem label="Coaches" value={coaches.length.toString()} />
            <StatItem label="Sessions" value="0" />
            <StatItem label="This Week" value="0" hasBorder={false} />
          </View>
          <Rule className="bg-foreground/10" />
        </View>


        <View className="flex-1" />

        {/* Main Carousel */}
        <View className="justify-end" style={{ overflow: 'visible', paddingBottom: 12 }}>
          <ArchedCarousel
            data={CAROUSEL_DATA}
            initialIndex={1}
            bend={20}
            cardWidth={CARD_WIDTH}
            cardSpacing={33}
            renderItem={(item: any) => {
              
              // 1. Render 'New Coach' Card
              if (item.type === 'create') {
                return (
                  <TouchableOpacity 
                    className="border-2 border-dashed border-secondary rounded-3xl justify-center items-center bg-surface" 
                    style={{ width: CARD_WIDTH, height: 260 }}
                    onPress={handleCreatePress} // <--- UPDATED: Calls the check function
                  >
                    <View className="w-11 h-11 rounded-full border-[1.5px] border-secondary justify-center items-center mb-2.5">
                      <Ionicons name="add" size={22} className="text-secondary" />
                    </View>
                    <Text className="text-[9px] uppercase tracking-[2px] text-secondary font-semibold">New Coach</Text>
                  </TouchableOpacity>
                );
              }

              // 2. Render Actual Coach Card
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
                      
                      {/* Card Header: Training Model */}
                      <View className="flex-row items-center justify-between px-4 py-3 border-b border-foreground/5 bg-background/10">
                        <Text className="text-[10px] uppercase tracking-[2px] font-black text-primary">
                          {item.training_model || 'GENERAL'}
                        </Text>
                      </View>

                      {/* Card Body: Info */}
                      <View className="flex-1 p-4 justify-center items-center">
                        <Text className="text-[80px] leading-[80px] mb-2">
                           {BASE_EMOJI}
                        </Text>
                        <Text 
                            className="text-2xl font-black text-foreground text-center -tracking-[1px] leading-7"
                            numberOfLines={2}
                        >
                            {item.name}
                        </Text>
                        
                        {/* Subtitle: Personality */}
                        <View className="mt-2 px-3 py-1 rounded-full bg-secondary/10">
                            <Text className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                                {item.personality || 'COACH'}
                            </Text>
                        </View>
                      </View>

                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* View All Footer */}
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