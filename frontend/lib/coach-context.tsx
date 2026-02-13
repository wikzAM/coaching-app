// lib/coach-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Define the shape of a Coach (Matches your Database & UI)
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
  // State for list of coaches and loading indicator
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCoaches = async () => {
    try {
      // 1. Get current session (user must be logged in)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCoaches([]);
        setIsLoading(false);
        return;
      }
      // 2. Fetch ONLY the coaches this user has hired (production logic)
      const user = session.user;
      const { data: userCoachData, error: userCoachError } = await supabase
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
      if (userCoachError) {
        // Partner: Log error if fetching user's hired coaches fails
        console.error('Error fetching user coaches:', userCoachError);
        setCoaches([]);
        setIsLoading(false);
        return;
      }
      // 4. Format database data for UI (matches Coach interface)
      const formattedCoaches: Coach[] = (userCoachData ?? []).map((item: any) => ({
        id: item.coaches.coach_id,
        name: item.coaches.name || item.coaches.training_model || 'Coach',
        training_model: item.coaches.training_model || 'General',
        personality: item.coaches.personality || 'Standard',
        avatar: (item.coaches.name?.[0] || item.coaches.training_model?.[0] || 'C').toUpperCase(),
      }));
      setCoaches(formattedCoaches);
    } catch (err) {
      // Partner: Log unexpected errors
      console.error('Unexpected error:', err);
      setCoaches([]);
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();

    // Partner: Re-fetch coaches when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchCoaches();
      } else {
        setCoaches([]);
        setIsLoading(false);
      }
    });

    // Partner: Clean up subscription on unmount
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