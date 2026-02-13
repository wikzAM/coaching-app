import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  ink: '#020912',       // Active / Border
  parchment: '#F9F6F1', // Background
  pine: '#4A706E',      // Inactive
};

// 2. Create the Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  // Use safe area insets to handle the notch/home bar on iPhone
  const insets = useSafeAreaInsets();

  // Get the name of the current active route (e.g., "index", "marketplace")
  const currentRoute = state.routes[state.index].name;

  return (
    <View style={{ backgroundColor: C.parchment }}>
      <View style={{
        borderTopWidth: 1,
        borderTopColor: C.ink,
        paddingHorizontal: 32,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 14, // Add safe area padding
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: C.parchment
      }}>

        {/* -- Home Tab -- */}
        <TouchableOpacity
          onPress={() => navigation.navigate('index')}
          style={{ padding: 8 }}
        >
          <Ionicons
            name={currentRoute === 'index' ? "home" : "home-outline"}
            size={22}
            color={currentRoute === 'index' ? C.ink : C.pine}
          />
        </TouchableOpacity>

        {/* -- Marketplace Tab -- */}
        <TouchableOpacity
          onPress={() => navigation.navigate('marketplace')}
          style={{ padding: 8 }}
        >
          <Ionicons
            name={currentRoute === 'marketplace' ? "compass" : "compass-outline"}
            size={22}
            color={currentRoute === 'marketplace' ? C.ink : C.pine}
          />
        </TouchableOpacity>

        {/* -- Profile Tab -- */}
        <TouchableOpacity
          onPress={() => navigation.navigate('user')}
          style={{ padding: 8 }}
        >
          <Ionicons
            name={currentRoute === 'user' ? "person" : "person-outline"}
            size={22}
            color={currentRoute === 'user' ? C.ink : C.pine}
          />
        </TouchableOpacity>

      </View>
    </View>
  );
}

// 3. Main Layout
export default function TabLayout() {
  return (
    <Tabs
      // Pass the custom component here
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Define the tabs so the router knows they exist */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="user" />

    </Tabs>
  );
}