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
          created_at: string
          created_by: string | null
          id: string
          permissions: string[] | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: string[] | null
          role?: string
          user_id: string
        }
        Update: {
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
          description: string | null
          id: string
          is_active: boolean
          nctr_reward: number | null
          opportunity_type: string
          partner_logo_url: string | null
          partner_name: string | null
          reward_per_dollar: number | null
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_link?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          nctr_reward?: number | null
          opportunity_type: string
          partner_logo_url?: string | null
          partner_name?: string | null
          reward_per_dollar?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_link?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          nctr_reward?: number | null
          opportunity_type?: string
          partner_logo_url?: string | null
          partner_name?: string | null
          reward_per_dollar?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nctr_locks: {
        Row: {
          created_at: string
          id: string
          lock_date: string
          lock_type: string
          nctr_amount: number
          status: string
          unlock_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lock_date?: string
          lock_type: string
          nctr_amount: number
          status?: string
          unlock_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lock_date?: string
          lock_type?: string
          nctr_amount?: number
          status?: string
          unlock_date?: string
          user_id?: string
        }
        Relationships: []
      }
      nctr_portfolio: {
        Row: {
          available_nctr: number
          created_at: string
          id: string
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
          created_at: string
          description: string | null
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
          created_at?: string
          description?: string | null
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
          created_at?: string
          description?: string | null
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
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
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
