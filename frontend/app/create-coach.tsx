import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Pressable,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
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

// Theme-aware colors resolved at render time
function useThemeColors() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return {
    primary: colors.tint,
    text: colors.text,
    background: colors.background,
    secondary: colorScheme === 'dark' ? 'rgba(249,246,241,0.5)' : 'rgba(2,9,18,0.5)',
    surfaceBorder: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    colorScheme,
  };
}

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
  const { primary, text, background, secondary, surfaceBorder, colorScheme } = useThemeColors();
  
  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState('');
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [selectedPersonality, setSelectedPersonality] = useState(PERSONALITIES[0]);
  const [coachName, setCoachName] = useState('');

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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('coach-model', {
        body: {
          model: selectedModel.id,
          personality: selectedPersonality.id,
          description: `${selectedModel.name} with ${selectedPersonality.name} vibes.`,
          custom: fullCustomInstructions,
          name: coachName.trim() || `${selectedModel.name} Coach`,
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            blurOnSubmit
            returnKeyType="done"
            value={goal}
            onChangeText={setGoal}
            autoFocus
          />
        </View>
        <View className="flex-1" />
        <TouchableOpacity onPress={() => { Keyboard.dismiss(); handleGetDiagnostics(); }} disabled={loading} className="bg-primary h-16 rounded-full flex-row items-center justify-center shadow-lg shadow-primary/30 mb-8">
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg tracking-widest uppercase mr-2">Start Analysis</Text>}
        </TouchableOpacity>
      </Animated.View>
    </TouchableWithoutFeedback>
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
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isSelected ? `${primary}18` : undefined,
                      borderColor: isSelected ? primary : 'transparent',
                    }}
                    className={isSelected ? '' : 'bg-surface'}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        marginRight: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: isSelected ? primary : secondary,
                      }}
                    >
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: primary }} />}
                    </View>
                    <Text
                      style={{ flex: 1, fontWeight: '700', color: isSelected ? primary : text }}
                    >{opt}</Text>
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
        {/* COACH NAME */}
        <View className="mb-10 px-6">
          <Text className="text-[10px] font-black text-secondary uppercase tracking-[2px] mb-4">Name Your Coach</Text>
          <TextInput
            className="bg-surface text-foreground text-lg font-bold p-4 rounded-2xl border-2 border-foreground/5"
            placeholder="E.g. My Startup Coach"
            placeholderTextColor={secondary}
            value={coachName}
            onChangeText={setCoachName}
            returnKeyType="done"
            blurOnSubmit
          />
        </View>

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
                  style={{
                    width: 260,
                    padding: 20,
                    borderRadius: 28,
                    borderWidth: 2,
                    backgroundColor: isActive ? primary : undefined,
                    borderColor: isActive ? primary : surfaceBorder,
                  }}
                  className="bg-surface"
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.1)',
                      }}
                    >
                      <Ionicons name={model.icon as any} size={20} color={isActive ? 'white' : 'gray'} />
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="white" />}
                  </View>
                  <Text
                    style={{ fontSize: 20, fontWeight: '900', marginBottom: 4, color: isActive ? 'white' : text }}
                  >{model.name}</Text>
                  <Text
                    style={{ fontSize: 14, lineHeight: 20, color: isActive ? 'rgba(255,255,255,0.9)' : secondary }}
                  >{model.long}</Text>
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
                  style={{
                    width: 140,
                    height: 160,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: isActive ? primary : surfaceBorder,
                  }}
                  className="bg-surface"
                >
                  <Text className="text-4xl mb-3">{persona.emoji}</Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 4, color: isActive ? primary : text }}
                  >{persona.name}</Text>
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