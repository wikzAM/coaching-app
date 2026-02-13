import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router as navigationRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import Animated, {
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    FadeInDown,
    ZoomIn,
    Layout,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SNAPPY_SPRING = {
    stiffness: 600,
    damping: 35,
    mass: 0.5,
};

const JumpingDot = ({ delay }: { delay: number }) => {
    const translateY = useSharedValue(0);

    React.useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withDelay(delay, withTiming(-6, { duration: 400 })), // Jump up
                withTiming(0, { duration: 400 }) // Fall down
            ),
            -1, // Infinite repeat
            false // Do not reverse
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View
            style={[animatedStyle]}
            className="w-2 h-2 rounded-full bg-foreground mx-0.5 opacity-60"
        />
    );
};

// ── ANIMATED TYPING INDICATOR COMPONENT ──
const TypingBubble = () => {
    return (
        <Animated.View
            entering={FadeInDown.springify()}
            className="items-start mb-4 ml-1"
        >
            <View
                className="rounded-[24px] overflow-hidden border-[2px] border-white/60 shadow-sm"
                style={{ borderBottomLeftRadius: 4 }}
            >
                <BlurView intensity={80} tint="default" style={StyleSheet.absoluteFill} />
                
                {/* CHANGED: px-4 (tighter bubble), gap-0.5 (dots closer) */}
                <View className="px-4 py-4 bg-surface/80 flex-row items-center h-[54px] gap-0.5">
                    <JumpingDot delay={0} />
                    <JumpingDot delay={150} />
                    <JumpingDot delay={300} />
                </View>
            </View>
        </Animated.View>
    );
};

export default function ChatScreen() {
    const { id, name } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const primaryColor = Colors[colorScheme].tint;

    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState([
        { id: '1', text: `Hey! I'm ${name}. How can I support your goals today?`, sender: 'bot' },
        { id: '2', text: `I can help you break down complex tasks or just listen.`, sender: 'bot' },
    ]);

    const [isTyping, setIsTyping] = useState(false)

        // ADD THESE TWO FUNCTIONS HERE:
    const loadMessages = async () => {
        try {
            const chatKey = `chat_${id}`;
            const stored = await AsyncStorage.getItem(chatKey);
            if (stored) {
                const loadedMessages = JSON.parse(stored);
                setMessages(loadedMessages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const saveMessages = async (msgs: typeof messages) => {
        try {
            const chatKey = `chat_${id}`;
            await AsyncStorage.setItem(chatKey, JSON.stringify(msgs));
        } catch (error) {
            console.error('Failed to save messages:', error);
        }
    };

    // Load messages when component mounts
    React.useEffect(() => {
        loadMessages();
    }, []);

    const sendMessage = useCallback(async () => {
        if (inputText.trim() === '' || isTyping) return;

        const userMsgText = inputText.trim();
        const userMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // 1. Update UI immediately for snappiness
    setMessages(prev => {
        const newUserMessages = [...prev, { id: userMsgId, text: userMsgText, sender: 'user' }];
        saveMessages(newUserMessages);
        return newUserMessages;
    });
        setInputText('');

        try {
            // timer for human ish feel
            const minDelay = 600;
            const maxDelay = 1500;
            const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

            await new Promise(resolve => setTimeout(resolve, randomDelay));

            setIsTyping(true);
            // 2. Call your Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('general-chat', {
                body: {
                    chat: userMsgText,
                    coachID: id 
                }
            });

            if (error) throw error;

            // 3. Add the bot's response to the chat
            if (data?.reply) {
                // SPLITTING LOGIC: Split by newline to create multiple bubbles
                const botLines = data.reply
                    .split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) => line.length > 0);

                const newBotMessages = botLines.map((line: string, index: number) => ({
                    id: `${Date.now()}-bot-${index}`,
                    text: line,
                    sender: 'bot'
                }));

                setMessages(prev => {
                    const updated = [...prev, ...newBotMessages];
                    saveMessages(updated);
                    return updated;
                });
            }
        } catch (err) {
            console.error('Chat Error:', err);
            // Optional: Add an error message to the chat UI here
        } finally {
            setIsTyping(false);
            // Scroll to bottom after state update
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [inputText, id, isTyping]);

    const flatListRef = useRef<FlatList>(null);
    const keyboardHeight = useSharedValue(0);

    const handleBack = useCallback(() => {
        if (navigationRouter.canGoBack()) navigationRouter.back();
        else navigationRouter.replace('/');
    }, []);

    // ── KEYBOARD HANDLER (Android Fix) ──
    useKeyboardHandler({
        onMove: (e) => { 'worklet'; keyboardHeight.value = e.height; },
        onEnd: (e) => { 'worklet'; keyboardHeight.value = e.height; },
    });

    const fakeViewStyle = useAnimatedStyle(() => ({
        height: Math.abs(keyboardHeight.value)
    }));

    const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
        const isUser = item.sender === 'user';
        const prevItem = messages[index - 1];
        const nextItem = messages[index + 1];

        const isFirstInGroup = !prevItem || prevItem.sender !== item.sender;
        const isLastInGroup = !nextItem || nextItem.sender !== item.sender;

        // ── PILL RADII LOGIC ──
        const standardRad = 32;
        const sharpRad = 8;

        return (
            <Animated.View
                entering={FadeInDown.springify().stiffness(SNAPPY_SPRING.stiffness).damping(SNAPPY_SPRING.damping).mass(SNAPPY_SPRING.mass)}
                layout={Layout.springify().stiffness(SNAPPY_SPRING.stiffness).damping(SNAPPY_SPRING.damping)}
                className={`${isUser ? 'items-end' : 'items-start'}`}
                // ── TIGHTENED SPACING ──
                style={{ marginBottom: isLastInGroup ? 16 : 3 }}
            >
                {isUser ? (
                    <View
                        className="px-6 py-4 max-w-[85%] bg-primary shadow-lg border-[2px] border-white/40"
                        style={{
                            borderRadius: standardRad,
                            borderTopRightRadius: !isFirstInGroup ? sharpRad : standardRad,
                            borderBottomRightRadius: !isLastInGroup ? sharpRad : standardRad,
                        }}
                    >
                        <Text className="text-[15px] font-bold leading-5 text-white">
                            {item.text}
                        </Text>
                    </View>
                ) : (
                    <View
                        className="max-w-[85%] rounded-[32px] overflow-hidden border-[2px] border-white/60 shadow-xl"
                        style={{
                            borderRadius: standardRad,
                            borderTopLeftRadius: !isFirstInGroup ? sharpRad : standardRad,
                            borderBottomLeftRadius: !isLastInGroup ? sharpRad : standardRad,
                        }}
                    >
                        <BlurView intensity={80} tint="default" style={StyleSheet.absoluteFill} />
                        <View
                            className="px-6 py-4 bg-surface border-[2px] border-border-subtle"
                            style={{
                                borderRadius: standardRad - 2,
                                borderTopLeftRadius: !isFirstInGroup ? sharpRad : standardRad - 2,
                                borderBottomLeftRadius: !isLastInGroup ? sharpRad : standardRad - 2,
                            }}
                        >
                            <Text className="text-[15px] font-bold leading-5 text-foreground">
                                {item.text}
                            </Text>
                        </View>
                    </View>
                )}
            </Animated.View>
        );
    }, [messages]);

    return (
        <View className="flex-1 bg-background">
            <LinearGradient
                colors={[primaryColor, 'transparent', 'transparent', primaryColor]}
                locations={[0, 0.3, 0.9, 1]}
                style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
            />

            <SafeAreaView className="flex-1" edges={['top']}>
                {/* ── HEADER ── */}
                <View className="px-6 py-4 flex-row items-center justify-between border-b border-foreground/10">
                    <TouchableOpacity
                        onPress={handleBack}
                        className="w-11 h-11 rounded-full bg-surface items-center justify-center border-[2px] border-foreground/10 shadow-sm"
                    >
                        <Ionicons name="arrow-back" size={20} className="text-foreground" />
                    </TouchableOpacity>

                    <View className="items-center flex-row gap-3">
                        <View className="w-12 h-12 rounded-full bg-foreground justify-center items-center shadow-lg border-[2px] border-background">
                            <Text className="text-background font-black text-xl">{(name as string)?.[0] || 'C'}</Text>
                        </View>
                        <View>
                            <Text className="text-lg font-black text-foreground -tracking-[1px] leading-tight">
                                {name?.toString().toUpperCase() || 'COACH'}
                            </Text>
                            <View className="flex-row items-center gap-1.5">
                                <View className="w-2 h-2 rounded-full bg-success shadow-sm" />
                                <Text className="text-[9px] font-black text-secondary uppercase tracking-[1.5px]">
                                    Active Now
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View className="w-11" />
                </View>

                {/* ── MESSAGES ── */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    
                    // 👇 CRITICAL: This ensures the bubble isn't hidden below the screen
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    
                    renderItem={renderMessage}
                    removeClippedSubviews={true}
                    ListFooterComponent={
                        isTyping ? <TypingBubble /> : <View className="h-4" />
                    }
                />

                {/* ── INPUT AREA ── */}
                <View className="px-5 pb-6 pt-3">
                    <View className="rounded-full overflow-hidden border-[2px] border-white/60 shadow-2xl">
                        <BlurView intensity={80} tint="default" style={StyleSheet.absoluteFill} />
                        <View className="flex-row items-center bg-surface/95 border-[2px] border-border-subtle rounded-full px-5 py-2">
                            <TextInput
                                placeholder="message..."
                                placeholderTextColor="rgba(2, 9, 18, 0.4)"
                                className="flex-1 text-[15px] font-bold text-foreground py-2.5 max-h-32"
                                style={{ outlineStyle: 'none' } as any}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                blurOnSubmit={false}
                                returnKeyType="send"
                                onSubmitEditing={sendMessage}
                            />
                            {inputText.length > 0 && (
                                <Animated.View entering={ZoomIn.duration(150)}>
                                    <TouchableOpacity
                                        onPress={sendMessage}
                                        className="ml-2 w-11 h-11 bg-primary rounded-full items-center justify-center shadow-lg border-[2px] border-white/40"
                                    >
                                        <Ionicons name="arrow-up" size={22} color="white" />
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Keyboard Spacer */}
                <Animated.View style={fakeViewStyle} />
            </SafeAreaView>
        </View>
    );
}