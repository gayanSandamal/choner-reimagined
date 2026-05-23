export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          primary_goal: string | null;
          main_struggle: string | null;
          accountability_mode: string | null;
          stress_level: string | null;
          onboarding_complete: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          primary_goal?: string | null;
          main_struggle?: string | null;
          accountability_mode?: string | null;
          stress_level?: string | null;
          onboarding_complete?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          primary_goal?: string | null;
          main_struggle?: string | null;
          accountability_mode?: string | null;
          stress_level?: string | null;
          onboarding_complete?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      challenge_templates: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          category: string;
          duration_days: number;
          difficulty: string;
          is_premium: boolean | null;
          sort_order: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          category: string;
          duration_days?: number;
          difficulty?: string;
          is_premium?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          category?: string;
          duration_days?: number;
          difficulty?: string;
          is_premium?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      user_challenges: {
        Row: {
          id: string;
          user_id: string;
          challenge_template_id: string;
          accountability_mode: string;
          status: string;
          started_at: string | null;
          ends_at: string | null;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_template_id: string;
          accountability_mode?: string;
          status?: string;
          started_at?: string | null;
          ends_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_template_id?: string;
          accountability_mode?: string;
          status?: string;
          started_at?: string | null;
          ends_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_challenges_challenge_template_id_fkey';
            columns: ['challenge_template_id'];
            isOneToOne: false;
            referencedRelation: 'challenge_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      challenge_tasks: {
        Row: {
          id: string;
          user_challenge_id: string;
          title: string;
          task_type: string;
          sort_order: number | null;
          due_window: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_challenge_id: string;
          title: string;
          task_type?: string;
          sort_order?: number | null;
          due_window?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_challenge_id?: string;
          title?: string;
          task_type?: string;
          sort_order?: number | null;
          due_window?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_tasks_user_challenge_id_fkey';
            columns: ['user_challenge_id'];
            isOneToOne: false;
            referencedRelation: 'user_challenges';
            referencedColumns: ['id'];
          },
        ];
      };
      task_checkins: {
        Row: {
          id: string;
          challenge_task_id: string;
          user_challenge_id: string;
          status: string;
          note: string | null;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          challenge_task_id: string;
          user_challenge_id: string;
          status?: string;
          note?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          challenge_task_id?: string;
          user_challenge_id?: string;
          status?: string;
          note?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'task_checkins_challenge_task_id_fkey';
            columns: ['challenge_task_id'];
            isOneToOne: false;
            referencedRelation: 'challenge_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_checkins_user_challenge_id_fkey';
            columns: ['user_challenge_id'];
            isOneToOne: false;
            referencedRelation: 'user_challenges';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          visibility: string | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          visibility?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          visibility?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      start_user_challenge: {
        Args: {
          p_user_id: string;
          p_template_id: string;
          p_accountability_mode: string;
        };
        Returns: string;
      };
      get_user_insights: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          consistency_score: number;
          best_time_of_day: string;
          streak_days: number;
          completion_rate: number;
        };
      };
    };
  };
}
