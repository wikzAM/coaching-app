import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { supabase } from '../lib/supabase';

type PhoneStep = 'enter' | 'verify';

interface PhoneAuthProps {
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

export default function PhoneAuth({ loading, setLoading }: PhoneAuthProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
    const [otpCode, setOtpCode] = useState('');
    const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

    /** Exchange a Firebase ID token for a Supabase session via Edge Function. */
    const exchangeFirebaseToken = async () => {
        const firebaseUser = auth().currentUser;
        if (!firebaseUser) throw new Error('Firebase user not found after verification');

        const idToken = await firebaseUser.getIdToken();

        const { data, error } = await supabase.functions.invoke('phone-auth', {
            body: { idToken },
        });

        if (error) throw new Error(error.message ?? 'Token exchange failed');

        // Set the Supabase session (triggers auth state change → navigates to app)
        await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
        });

        // Sign out of Firebase — we only use it for phone verification
        await auth().signOut();
    };

    const onSendOTP = async () => {
        if (!phoneNumber.trim()) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
        }
        setLoading(true);
        try {
            const confirmationResult = await auth().signInWithPhoneNumber(formattedPhone);
            setConfirmation(confirmationResult);
            setPhoneStep('verify');
            Alert.alert('Code Sent', `Verification code sent to ${formattedPhone}`);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const onVerifyOTP = async () => {
        if (!otpCode.trim() || otpCode.length !== 6) return;
        if (!confirmation) {
            Alert.alert('Error', 'Please request a code first');
            return;
        }
        setLoading(true);
        try {
            // Verify OTP with Firebase
            await confirmation.confirm(otpCode);

            // Exchange Firebase ID token for a Supabase session
            await exchangeFirebaseToken();
        } catch (err: any) {
            // If auto-verified, Firebase currentUser may already exist
            if (auth().currentUser) {
                try {
                    await exchangeFirebaseToken();
                    return;
                } catch (exchangeErr: any) {
                    Alert.alert('Error', exchangeErr.message);
                }
            } else {
                Alert.alert('Error', err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (phoneStep === 'enter') {
        return (
            <View className="w-full">
                <Text className="text-sm text-gray-600 mb-2">Phone Number</Text>
                <TextInput
                    className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg mb-4 bg-white"
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                />
                <Pressable onPress={onSendOTP} disabled={loading} className="bg-black rounded-xl py-4 items-center">
                    {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Send Code</Text>}
                </Pressable>
            </View>
        );
    }

    return (
        <View className="w-full">
            <Text className="text-sm text-gray-600 mb-2">Enter Code</Text>
            <TextInput
                className="w-full border border-gray-300 rounded-xl px-4 py-4 text-2xl text-center mb-4 bg-white"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
            />
            <Pressable onPress={onVerifyOTP} disabled={loading} className="bg-black rounded-xl py-4 items-center mb-3">
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Verify</Text>}
            </Pressable>
            <Pressable onPress={() => { setPhoneStep('enter'); setConfirmation(null); }}>
                <Text className="text-gray-500 text-center">Change Number</Text>
            </Pressable>
        </View>
    );
}
