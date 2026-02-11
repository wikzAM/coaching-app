// lib/coach-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

// 1. DEV MODE CONSTANT (Matches your backend)
const TEST_USER_ID = "099cc5d8-2318-40e7-b1f8-334a4146a014";

// 2. Define the shape of a Coach (Matches your Database & UI)
export interface Coach {
  id: string;
  name: string;
  training_model: string;
  personality: string;
  avatar: string; // Helper for UI
}

interface CoachContextType {
  coaches: Coach[];
  isLoading: boolean;
  refreshCoaches: () => Promise<void>;
  hasCoach: (coachId: string) => boolean;
}

const CoachContext = createContext<CoachContextType | undefined>(undefined);

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCoaches = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
          setCoaches([]);
          setIsLoading(false);
          return;
      // --- DEV MODE FETCH ---
      // We explicitly fetch coaches created by your Test User ID
      // so you can see them without needing full Auth login flow yet.
      
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('created_by', TEST_USER_ID) 
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coaches:', error);
        return;
      }
      const user = session.user;

      // 2. Fetch ONLY the coaches this user has hired
      const { data, error } = await supabase
        .from('user_coaches')
        .select(`
          coach_id,
          coaches (
            coach_id,
            name,
            training_model,
            personality,
            description,
            created_by
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // 3. Format database data for your UI
      const formatted = data.map((item: any) => ({
        id: item.coaches.coach_id,
        name: item.coaches.name || item.coaches.training_model || 'Coach',
        specialty: item.coaches.personality || 'Generalist',
        avatar: (item.coaches.name?.[0] || item.coaches.training_model?.[0] || 'C').toUpperCase(),
        model: item.coaches.training_model,
      }));

      setCoaches(formatted);
      if (data) {
        // 3. Map Database fields to UI fields
        const formattedCoaches = data.map((item: any) => ({
          id: item.coach_id,
          name: item.name || 'Coach',
          training_model: item.training_model || 'General',
          personality: item.personality || 'Standard',
          avatar: (item.name || 'C').charAt(0).toUpperCase(), // Generate Avatar letter
        }));
        setCoaches(formattedCoaches);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();

    // Re-fetch when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchCoaches();
      } else {
        setCoaches([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper to check if a coach is already in the list
  const hasCoach = (id: string) => coaches.some(c => c.id === id);

  return (
    <CoachContext.Provider value={{ coaches, isLoading, refreshCoaches: fetchCoaches, hasCoach }}>
      {children}
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) throw new Error('useCoach must be used within a CoachProvider');
  return context;
}