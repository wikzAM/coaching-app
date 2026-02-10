import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Pressable,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- CONSTANTS ---
// (Keep your MODELS and PERSONALITIES arrays here same as before)
const TEST_USER_ID = "099cc5d8-2318-40e7-b1f8-334a4146a014"; 

const MODELS = [
  { id: 'GROW', name: 'The Strategist (GROW)', desc: 'Goal • Reality • Options • Will', long: 'Moves you from "stuck" to "action" in 4 steps.', icon: 'compass-outline' },
  { id: 'OSKAR', name: 'The Optimist (OSKAR)', desc: 'Outcome • Scaling • Know-how', long: 'Focuses on what is already working.', icon: 'sunny-outline' },
  { id: 'CIGAR', name: 'The Analyst (CIGAR)', desc: 'Reality • Gaps • Action', long: 'Ruthlessly identifies what is missing.', icon: 'analytics-outline' },
  { id: 'FUEL', name: 'The Executive (FUEL)', desc: 'Frame • Understand • Plan', long: 'Fast, direct, and professional.', icon: 'flash-outline' },
  { id: 'CLEAR', name: 'The Transformer (CLEAR)', desc: 'Listen • Explore • Review', long: 'Deeply reflective.', icon: 'water-outline' },
];

const PERSONALITIES = [
  { id: 'Sage', name: 'The Sage', desc: 'Calm, metaphorical.', prompt: 'You are calm, reflective, and use metaphors.', emoji: '🧘‍♂️'},
  { id: 'Drill', name: 'Drill Sergeant', desc: 'High energy, strict.', prompt: 'You are high-energy and strict. No excuses.', emoji: '🪖'},
  { id: 'Bestie', name: 'Supportive Bestie', desc: 'Empathetic, warm.', prompt: 'You are a supportive friend. Use emojis.', emoji: '✨'},
  { id: 'Pro', name: 'The Professional', desc: 'Objective, dry.', prompt: 'You are strictly professional. No fluff.', emoji: '👔'},
];

export default function CreateCoachScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const primary = Colors[colorScheme].tint;
  
  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState('');
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [selectedPersonality, setSelectedPersonality] = useState(PERSONALITIES[0]);

  // --- ACTIONS ---
  const handleGetDiagnostics = async () => {
    if (!goal.trim()) return Alert.alert("Missing Input", "Please tell us what you want to work on.");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('diagnostic-mcqs', {
        body: { initialGoal: goal }
      });
      if (error) throw error;
      if (data?.questions) {
        setDiagnostics(data.questions);
        setStep(2);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoach = async () => {
    setLoading(true);
    try {
      const diagnosticSummary = Object.entries(mcqAnswers)
        .map(([qId, ans]) => `Diagnostic Q${qId}: User selected "${ans}"`)
        .join('\n');

      const fullCustomInstructions = `
        ${selectedPersonality.prompt}
        USER CONTEXT:
        Goal: ${goal}
        ${diagnosticSummary}
      `;

      const { error } = await supabase.functions.invoke('coach-model', {
        body: {
          model: selectedModel.id,
          personality: selectedPersonality.id,
          description: `${selectedModel.name} with ${selectedPersonality.name} vibes.`,
          custom: fullCustomInstructions,
          user_id: TEST_USER_ID 
        }
      });

      if (error) throw error;
        router.push('/'); 
    } catch (err: any) {
      Alert.alert("Creation Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER STEPS ---

  // STEP 1
  const renderStep1 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeInLeft} className="flex-1 px-6 pt-10">
      <TouchableOpacity onPress={() => router.back()} className="mb-6 w-10 h-10 rounded-full bg-surface items-center justify-center border border-foreground/5">
        <Ionicons name="close" size={24} className="text-foreground" />
      </TouchableOpacity>
      
      <Text className="text-[34px] font-black text-foreground leading-tight mb-2">New Coach</Text>
      <Text className="text-lg text-secondary font-medium mb-10">What challenge is on your mind?</Text>

      <View className="bg-surface p-6 rounded-[32px] border-[2px] border-foreground/5 shadow-sm min-h-[200px]">
        <TextInput 
          className="text-xl font-bold text-foreground leading-7"
          placeholder="E.g. I want to launch a startup but I keep procrastinating..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={goal}
          onChangeText={setGoal}
          autoFocus
        />
      </View>
      <View className="flex-1" />
      <TouchableOpacity onPress={handleGetDiagnostics} disabled={loading} className="bg-primary h-16 rounded-full flex-row items-center justify-center shadow-lg shadow-primary/30 mb-8">
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg tracking-widest uppercase mr-2">Start Analysis</Text>}
      </TouchableOpacity>
    </Animated.View>
  );

  // STEP 2
  const renderStep2 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeInLeft} className="flex-1">
      <View className="px-6 pt-10 pb-2 flex-row items-center">
        {/* BACK BUTTON ADDED HERE */}
        <TouchableOpacity onPress={() => setStep(1)} className="mr-4 w-10 h-10 rounded-full bg-surface items-center justify-center border border-foreground/5">
          <Ionicons name="arrow-back" size={24} className="text-foreground" />
        </TouchableOpacity>
        <View>
            <Text className="text-2xl font-black text-foreground">Let's go deeper.</Text>
            <Text className="text-secondary font-medium">Help me understand.</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {diagnostics.map((q, index) => (
          <Animated.View key={q.id} entering={FadeInDown.delay(index * 200).springify()} className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-4 leading-6">{index + 1}. {q.text}</Text>
            <View className="gap-2">
              {q.options.map((opt: string) => {
                const isSelected = mcqAnswers[q.id] === opt;
                return (
                  <TouchableOpacity 
                    key={opt}
                    onPress={() => setMcqAnswers({...mcqAnswers, [q.id]: opt})}
                    activeOpacity={0.8}
                    className={`p-4 rounded-2xl border-[2px] flex-row items-center ${isSelected ? 'bg-primary/10 border-primary' : 'bg-surface border-transparent'}`}
                  >
                    <View className={`w-5 h-5 rounded-full border-[2px] mr-3 items-center justify-center ${isSelected ? 'border-primary' : 'border-secondary/30'}`}>
                      {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </View>
                    <Text className={`flex-1 font-bold ${isSelected ? 'text-primary' : 'text-secondary'}`}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 blur-xl border-t border-foreground/5">
        <TouchableOpacity 
          onPress={() => {
            if (Object.keys(mcqAnswers).length < diagnostics.length) {
              Alert.alert("Hold on", "Please answer all questions.");
              return;
            }
            setStep(3);
          }}
          className="bg-primary h-16 rounded-full items-center justify-center shadow-lg shadow-primary/30"
        >
          <Text className="text-white font-black text-lg tracking-widest uppercase">Next Step</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // STEP 3
  const renderStep3 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeInLeft} className="flex-1">
      <View className="px-6 pt-10 pb-2 flex-row items-center">
        {/* BACK BUTTON ADDED HERE */}
        <TouchableOpacity onPress={() => setStep(2)} className="mr-4 w-10 h-10 rounded-full bg-surface items-center justify-center border border-foreground/5">
          <Ionicons name="arrow-back" size={24} className="text-foreground" />
        </TouchableOpacity>
        <View>
            <Text className="text-2xl font-black text-foreground">Final Polish</Text>
            <Text className="text-secondary font-medium">Design your coach.</Text>
        </View>
      </View>

      <ScrollView className="flex-1 pt-6" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* MODEL SELECTOR */}
        <View className="mb-10">
          <Text className="px-6 text-[10px] font-black text-secondary uppercase tracking-[2px] mb-4">The Framework</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
            {MODELS.map((model) => {
              const isActive = selectedModel.id === model.id;
              return (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => setSelectedModel(model)}
                  activeOpacity={0.9}
                  className={`w-[260px] p-5 rounded-[28px] border-[2px] ${isActive ? 'bg-primary border-primary' : 'bg-surface border-foreground/5'}`}
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isActive ? 'bg-white/20' : 'bg-secondary/10'}`}>
                      <Ionicons name={model.icon as any} size={20} color={isActive ? 'white' : 'gray'} />
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="white" />}
                  </View>
                  <Text className={`text-xl font-black mb-1 ${isActive ? 'text-white' : 'text-foreground'}`}>{model.name}</Text>
                  <Text className={`text-sm leading-5 ${isActive ? 'text-white/90' : 'text-foreground/70'}`}>{model.long}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* PERSONALITY SELECTOR */}
        <View>
          <Text className="px-6 text-[10px] font-black text-secondary uppercase tracking-[2px] mb-4">The Vibe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
            {PERSONALITIES.map((persona) => {
              const isActive = selectedPersonality.id === persona.id;
              return (
                <Pressable
                  key={persona.id}
                  onPress={() => setSelectedPersonality(persona)}
                  className={`w-[140px] h-[160px] rounded-[24px] items-center justify-center border-[2px] active:opacity-70 ${isActive ? 'bg-surface border-primary shadow-xl shadow-primary/20' : 'bg-surface border-foreground/5'}`}
                >
                  <Text className="text-4xl mb-3">{persona.emoji}</Text>
                  <Text className={`text-sm font-black text-center mb-1 ${isActive ? 'text-primary' : 'text-foreground'}`}>{persona.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-background/90 blur-lg border-t border-foreground/5">
        <TouchableOpacity onPress={handleCreateCoach} disabled={loading} className="bg-foreground h-14 rounded-full flex-row items-center justify-center">
          {loading ? <ActivityIndicator color={colorScheme === 'dark' ? 'black' : 'white'} /> : (
            <>
              <Text className="text-background font-black text-lg tracking-widest uppercase mr-2">Hire Coach</Text>
              <Ionicons name="checkmark" size={20} color={colorScheme === 'dark' ? 'black' : 'white'} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-background">
      <LinearGradient colors={[primary, 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 300, opacity: 0.15 }} />
      <SafeAreaView className="flex-1">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </SafeAreaView>
    </View>
  );
}