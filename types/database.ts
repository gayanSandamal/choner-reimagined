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
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          group_id: string | null;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id?: string | null;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string | null;
          author_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_reactions: {
        Row: {
          post_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          reaction?: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          reaction?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          title: string;
          body?: string | null;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          title?: string;
          body?: string | null;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          push_enabled: boolean | null;
          streak_alerts: boolean | null;
          accountability_alerts: boolean | null;
          ai_recovery_alerts: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          push_enabled?: boolean | null;
          streak_alerts?: boolean | null;
          accountability_alerts?: boolean | null;
          ai_recovery_alerts?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          push_enabled?: boolean | null;
          streak_alerts?: boolean | null;
          accountability_alerts?: boolean | null;
          ai_recovery_alerts?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          revenuecat_user_id: string | null;
          entitlement: string;
          status: 'active' | 'in_grace_period' | 'in_billing_retry' | 'paused' | 'inactive' | 'expired';
          product_id: string | null;
          store: 'app_store' | 'play_store' | 'stripe' | 'promotional' | null;
          original_purchase_at: string | null;
          expires_at: string | null;
          will_renew: boolean | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          revenuecat_user_id?: string | null;
          entitlement?: string;
          status?: 'active' | 'in_grace_period' | 'in_billing_retry' | 'paused' | 'inactive' | 'expired';
          product_id?: string | null;
          store?: 'app_store' | 'play_store' | 'stripe' | 'promotional' | null;
          original_purchase_at?: string | null;
          expires_at?: string | null;
          will_renew?: boolean | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          revenuecat_user_id?: string | null;
          entitlement?: string;
          status?: 'active' | 'in_grace_period' | 'in_billing_retry' | 'paused' | 'inactive' | 'expired';
          product_id?: string | null;
          store?: 'app_store' | 'play_store' | 'stripe' | 'promotional' | null;
          original_purchase_at?: string | null;
          expires_at?: string | null;
          will_renew?: boolean | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_kind: 'post' | 'comment' | 'profile' | 'group';
          target_id: string;
          reason: string;
          details: string | null;
          status: 'open' | 'reviewed' | 'actioned' | 'dismissed';
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_kind: 'post' | 'comment' | 'profile' | 'group';
          target_id: string;
          reason: string;
          details?: string | null;
          status?: 'open' | 'reviewed' | 'actioned' | 'dismissed';
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_kind?: 'post' | 'comment' | 'profile' | 'group';
          target_id?: string;
          reason?: string;
          details?: string | null;
          status?: 'open' | 'reviewed' | 'actioned' | 'dismissed';
          created_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          props: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          props?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          props?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          last_message_at?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: 'system' | 'user' | 'assistant';
          content: string;
          tokens_in: number | null;
          tokens_out: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: 'system' | 'user' | 'assistant';
          content: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: 'system' | 'user' | 'assistant';
          content?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_devices: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          platform: string | null;
          last_seen_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform?: string | null;
          last_seen_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          platform?: string | null;
          last_seen_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      challenge_invites: {
        Row: {
          id: string;
          user_challenge_id: string | null;
          email: string;
          status: string | null;
          invited_by: string | null;
          token: string | null;
          accepted_by: string | null;
          accepted_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_challenge_id?: string | null;
          email: string;
          status?: string | null;
          invited_by?: string | null;
          token?: string | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_challenge_id?: string | null;
          email?: string;
          status?: string | null;
          invited_by?: string | null;
          token?: string | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
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
      ensure_default_challenges: {
        Args: {
          p_user_id: string;
          p_solo_template_id?: string;
          p_partner_template_id?: string;
        };
        Returns: void;
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
      get_user_insights_series: {
        Args: {
          p_user_id: string;
          p_days?: number;
        };
        Returns: { day: string; completions: number }[];
      };
      is_premium: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      accept_challenge_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      delete_account: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
