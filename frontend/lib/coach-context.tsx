import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

// 1. Define what a "Coach" looks like in your app
export interface Coach {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  model: string; 
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          setIsLoading(false);
          return;
      }

      // 2. Fetch ONLY the coaches this user has hired
      const { data, error } = await supabase
        .from('user_coaches')
        .select(`
          coach_id,
          coaches (
            coach_id,
            training_model,
            personality
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // 3. Format database data for your UI
      const formatted = data.map((item: any) => ({
        id: item.coaches.coach_id,
        name: item.coaches.training_model || 'Coach',
        specialty: item.coaches.personality || 'Generalist',
        avatar: (item.coaches.training_model?.[0] || 'C').toUpperCase(),
        model: item.coaches.training_model,
      }));

      setCoaches(formatted);
    } catch (err) {
      console.error('Error fetching coaches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  // Helper to check if a coach is already hired
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