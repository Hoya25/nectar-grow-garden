export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          access_level: string | null
          created_at: string
          created_by: string | null
          id: string
          permissions: string[] | null
          role: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: string[] | null
          role?: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: string[] | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          category: string | null
          commission_rate: number | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          is_active: boolean
          logo_url: string | null
          loyalize_id: string | null
          name: string
          nctr_per_dollar: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          loyalize_id?: string | null
          name: string
          nctr_per_dollar?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          loyalize_id?: string | null
          name?: string
          nctr_per_dollar?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      earning_opportunities: {
        Row: {
          affiliate_link: string | null
          created_at: string
          default_lock_type: string | null
          description: string | null
          id: string
          is_active: boolean
          max_per_status: number | null
          min_status: string | null
          nctr_reward: number | null
          opportunity_type: string
          partner_logo_url: string | null
          partner_name: string | null
          reward_per_dollar: number | null
          title: string
          updated_at: string
          video_description: string | null
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          affiliate_link?: string | null
          created_at?: string
          default_lock_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_per_status?: number | null
          min_status?: string | null
          nctr_reward?: number | null
          opportunity_type: string
          partner_logo_url?: string | null
          partner_name?: string | null
          reward_per_dollar?: number | null
          title: string
          updated_at?: string
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          affiliate_link?: string | null
          created_at?: string
          default_lock_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_per_status?: number | null
          min_status?: string | null
          nctr_reward?: number | null
          opportunity_type?: string
          partner_logo_url?: string | null
          partner_name?: string | null
          reward_per_dollar?: number | null
          title?: string
          updated_at?: string
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      nctr_locks: {
        Row: {
          can_upgrade: boolean | null
          commitment_days: number | null
          created_at: string
          id: string
          lock_category: string | null
          lock_date: string
          lock_type: string
          nctr_amount: number
          original_lock_type: string | null
          status: string
          unlock_date: string
          upgraded_from_lock_id: string | null
          user_id: string
        }
        Insert: {
          can_upgrade?: boolean | null
          commitment_days?: number | null
          created_at?: string
          id?: string
          lock_category?: string | null
          lock_date?: string
          lock_type: string
          nctr_amount: number
          original_lock_type?: string | null
          status?: string
          unlock_date: string
          upgraded_from_lock_id?: string | null
          user_id: string
        }
        Update: {
          can_upgrade?: boolean | null
          commitment_days?: number | null
          created_at?: string
          id?: string
          lock_category?: string | null
          lock_date?: string
          lock_type?: string
          nctr_amount?: number
          original_lock_type?: string | null
          status?: string
          unlock_date?: string
          upgraded_from_lock_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nctr_portfolio: {
        Row: {
          available_nctr: number
          created_at: string
          id: string
          lock_360_nctr: number | null
          lock_90_nctr: number | null
          opportunity_status: string
          pending_nctr: number
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_nctr?: number
          created_at?: string
          id?: string
          lock_360_nctr?: number | null
          lock_90_nctr?: number | null
          opportunity_status?: string
          pending_nctr?: number
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_nctr?: number
          created_at?: string
          id?: string
          lock_360_nctr?: number | null
          lock_90_nctr?: number | null
          opportunity_status?: string
          pending_nctr?: number
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nctr_transactions: {
        Row: {
          auto_lock_type: string | null
          created_at: string
          description: string | null
          earning_source: string | null
          id: string
          nctr_amount: number
          opportunity_id: string | null
          partner_name: string | null
          purchase_amount: number | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          auto_lock_type?: string | null
          created_at?: string
          description?: string | null
          earning_source?: string | null
          id?: string
          nctr_amount: number
          opportunity_id?: string | null
          partner_name?: string | null
          purchase_amount?: number | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          auto_lock_type?: string | null
          created_at?: string
          description?: string | null
          earning_source?: string | null
          id?: string
          nctr_amount?: number
          opportunity_id?: string | null
          partner_name?: string | null
          purchase_amount?: number | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nctr_transactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "earning_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_status_levels: {
        Row: {
          benefits: string[] | null
          created_at: string
          description: string | null
          id: string
          max_opportunities: number | null
          min_lock_duration: number
          min_locked_nctr: number
          reward_multiplier: number
          status_name: string
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_opportunities?: number | null
          min_lock_duration?: number
          min_locked_nctr?: number
          reward_multiplier?: number
          status_name: string
        }
        Update: {
          benefits?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_opportunities?: number | null
          min_lock_duration?: number
          min_locked_nctr?: number
          reward_multiplier?: number
          status_name?: string
        }
        Relationships: []
      }
      partner_campaigns: {
        Row: {
          bonus_multiplier: number | null
          brand_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          max_reward: number | null
          min_purchase: number | null
          start_date: string
          terms_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bonus_multiplier?: number | null
          brand_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_reward?: number | null
          min_purchase?: number | null
          start_date?: string
          terms_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bonus_multiplier?: number | null
          brand_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_reward?: number | null
          min_purchase?: number | null
          start_date?: string
          terms_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
          wallet_connected_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
          wallet_connected_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
          wallet_connected_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          reward_credited: boolean
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          reward_credited?: boolean
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_credited?: boolean
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_sample_brands: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auto_lock_earned_nctr: {
        Args: {
          p_earning_source: string
          p_nctr_amount: number
          p_opportunity_type?: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_lock_balances: {
        Args: { user_id: string }
        Returns: {
          lock_360_total: number
          lock_90_total: number
        }[]
      }
      calculate_user_status: {
        Args: { user_id: string }
        Returns: string
      }
      check_admin_access_level: {
        Args: { required_level: string }
        Returns: boolean
      }
      check_user_is_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      commit_available_to_360lock: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      decrement: {
        Args: { x: number }
        Returns: number
      }
      get_admin_profiles_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      get_admin_safe_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
          username: string
          wallet_address: string
          wallet_connected_at: string
        }[]
      }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_sensitive_profile_data: {
        Args: { target_user_id: string }
        Returns: {
          email: string
          user_id: string
          wallet_address: string
          wallet_connected_at: string
        }[]
      }
      get_user_status_details: {
        Args: { target_user_id?: string }
        Returns: {
          current_locked_nctr: number
          current_min_duration: number
          next_required_duration: number
          next_required_locked: number
          next_status: string
          opportunity_status: string
          required_lock_duration: number
          required_locked_nctr: number
          reward_multiplier: number
          status_benefits: string[]
          status_description: string
          user_id: string
        }[]
      }
      increment: {
        Args: { x: number }
        Returns: number
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      make_user_admin_by_email: {
        Args: { admin_role?: string; user_email: string }
        Returns: string
      }
      move_pending_to_available: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      process_referral_reward: {
        Args: { p_referral_id: string }
        Returns: Json
      }
      update_user_status: {
        Args: { user_id: string }
        Returns: Json
      }
      upgrade_lock_to_360: {
        Args: { p_lock_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
