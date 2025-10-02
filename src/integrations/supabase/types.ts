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
      affiliate_link_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: string | null
          link_id: string
          referrer: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          link_id: string
          referrer?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "independent_affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_link_mappings: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          tracking_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          tracking_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          tracking_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
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
          available_nctr_reward: number | null
          brand_id: string | null
          created_at: string
          cta_text: string | null
          default_lock_type: string | null
          description: string | null
          display_order: number | null
          featured: boolean
          id: string
          is_active: boolean
          lock_360_nctr_reward: number | null
          lock_90_nctr_reward: number | null
          max_per_status: number | null
          min_status: string | null
          nctr_reward: number | null
          opportunity_type: string
          partner_logo_url: string | null
          partner_name: string | null
          reward_distribution_type: string | null
          reward_per_dollar: number | null
          reward_structure: Json | null
          social_handle: string | null
          social_platform: string | null
          title: string
          updated_at: string
          video_description: string | null
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          affiliate_link?: string | null
          available_nctr_reward?: number | null
          brand_id?: string | null
          created_at?: string
          cta_text?: string | null
          default_lock_type?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean
          id?: string
          is_active?: boolean
          lock_360_nctr_reward?: number | null
          lock_90_nctr_reward?: number | null
          max_per_status?: number | null
          min_status?: string | null
          nctr_reward?: number | null
          opportunity_type: string
          partner_logo_url?: string | null
          partner_name?: string | null
          reward_distribution_type?: string | null
          reward_per_dollar?: number | null
          reward_structure?: Json | null
          social_handle?: string | null
          social_platform?: string | null
          title: string
          updated_at?: string
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          affiliate_link?: string | null
          available_nctr_reward?: number | null
          brand_id?: string | null
          created_at?: string
          cta_text?: string | null
          default_lock_type?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean
          id?: string
          is_active?: boolean
          lock_360_nctr_reward?: number | null
          lock_90_nctr_reward?: number | null
          max_per_status?: number | null
          min_status?: string | null
          nctr_reward?: number | null
          opportunity_type?: string
          partner_logo_url?: string | null
          partner_name?: string | null
          reward_distribution_type?: string | null
          reward_per_dollar?: number | null
          reward_structure?: Json | null
          social_handle?: string | null
          social_platform?: string | null
          title?: string
          updated_at?: string
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earning_opportunities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      independent_affiliate_links: {
        Row: {
          click_count: number | null
          conversion_count: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          original_affiliate_url: string
          platform_name: string
          total_commissions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          click_count?: number | null
          conversion_count?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          original_affiliate_url: string
          platform_name: string
          total_commissions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          click_count?: number | null
          conversion_count?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          original_affiliate_url?: string
          platform_name?: string
          total_commissions?: number | null
          updated_at?: string
          user_id?: string
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
          last_sync_at: string | null
          lock_360_nctr: number | null
          lock_90_nctr: number | null
          nctr_live_available: number | null
          nctr_live_lock_360: number | null
          nctr_live_total: number | null
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
          last_sync_at?: string | null
          lock_360_nctr?: number | null
          lock_90_nctr?: number | null
          nctr_live_available?: number | null
          nctr_live_lock_360?: number | null
          nctr_live_total?: number | null
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
          last_sync_at?: string | null
          lock_360_nctr?: number | null
          lock_90_nctr?: number | null
          nctr_live_available?: number | null
          nctr_live_lock_360?: number | null
          nctr_live_total?: number | null
          opportunity_status?: string
          pending_nctr?: number
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nctr_price_cache: {
        Row: {
          created_at: string
          id: string
          price_usd: number
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_usd: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price_usd?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nctr_transactions: {
        Row: {
          auto_lock_type: string | null
          created_at: string
          description: string | null
          earning_source: string | null
          external_transaction_id: string | null
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
          external_transaction_id?: string | null
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
          external_transaction_id?: string | null
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
      price_access_log: {
        Row: {
          access_count: number | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
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
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_table: string
          risk_level: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_table: string
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_table?: string
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
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
      treasury_admin_roles: {
        Row: {
          access_reason: string | null
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          is_active: boolean
          last_access_at: string | null
          role_type: string
          session_token: string | null
          user_id: string
        }
        Insert: {
          access_reason?: string | null
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          role_type: string
          session_token?: string | null
          user_id: string
        }
        Update: {
          access_reason?: string | null
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          role_type?: string
          session_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      treasury_config: {
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
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          failure_reason: string | null
          gas_fee_nctr: number | null
          id: string
          nctr_amount: number
          net_amount_nctr: number
          processed_at: string | null
          request_hash: string | null
          status: string
          transaction_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          failure_reason?: string | null
          gas_fee_nctr?: number | null
          id?: string
          nctr_amount: number
          net_amount_nctr: number
          processed_at?: string | null
          request_hash?: string | null
          status?: string
          transaction_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          failure_reason?: string | null
          gas_fee_nctr?: number | null
          id?: string
          nctr_amount?: number
          net_amount_nctr?: number
          processed_at?: string | null
          request_hash?: string | null
          status?: string
          transaction_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_withdrawal_requests_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      apply_reward_multiplier: {
        Args: { p_base_amount: number; p_user_id: string }
        Returns: number
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
      award_affiliate_nctr: {
        Args:
          | {
              p_base_nctr_amount: number
              p_brand_name?: string
              p_earning_source?: string
              p_purchase_amount?: number
              p_user_id: string
            }
          | {
              p_base_nctr_amount: number
              p_earning_source?: string
              p_user_id: string
            }
        Returns: Json
      }
      award_profile_completion_bonus: {
        Args: { p_user_id: string }
        Returns: Json
      }
      calculate_lock_balances: {
        Args: { user_id: string }
        Returns: {
          lock_360_total: number
          lock_90_total: number
        }[]
      }
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: Json
      }
      calculate_user_status: {
        Args: { user_id: string }
        Returns: string
      }
      check_admin_access_level: {
        Args: { required_level: string }
        Returns: boolean
      }
      check_business_data_rate_limit: {
        Args: { p_table_name: string }
        Returns: boolean
      }
      check_price_access_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_user_is_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      check_user_is_admin_secure: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_all_nctr_to_360lock: {
        Args: { p_user_id: string }
        Returns: Json
      }
      commit_available_to_360lock: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      create_secure_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: Json
      }
      create_withdrawal_request: {
        Args: { p_nctr_amount: number; p_wallet_address: string }
        Returns: Json
      }
      decrement: {
        Args: { x: number }
        Returns: number
      }
      detect_suspicious_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_activity: string
          suspicious_actions: number
          user_id: string
        }[]
      }
      detect_suspicious_patterns: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_activity: string
          risk_score: number
          suspicious_activities: string[]
          user_id: string
        }[]
      }
      emergency_revoke_admin_access: {
        Args: { p_user_email: string }
        Returns: Json
      }
      enhanced_price_access_control: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_admin_financial_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_admin_financial_access_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_admin_profile_summary: {
        Args: { target_user_ids: string[] }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          masked_email: string
          user_id: string
          username: string
        }[]
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
      get_admin_safe_profile_data: {
        Args: { target_user_id: string }
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
      get_admin_safe_profile_summary: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          has_wallet: boolean
          profile_completion_score: number
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
      get_admin_user_activity: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_admin_user_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          available_nctr: number
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          lock_360_nctr: number
          lock_90_nctr: number
          opportunity_status: string
          pending_nctr: number
          total_earned: number
          updated_at: string
          user_id: string
          username: string
          wallet_address: string
          wallet_connected_at: string
        }[]
      }
      get_admin_user_stats: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_admin_withdrawal_by_id: {
        Args: { withdrawal_id: string }
        Returns: {
          admin_notes: string
          created_at: string
          email_masked: string
          full_name: string
          id: string
          nctr_amount: number
          net_amount_nctr: number
          processed_at: string
          status: string
          user_id: string
          username: string
          wallet_address_masked: string
        }[]
      }
      get_admin_withdrawal_data: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          admin_notes: string
          created_at: string
          email_masked: string
          failure_reason_masked: string
          full_name: string
          gas_fee_nctr: number
          id: string
          nctr_amount: number
          net_amount_nctr: number
          processed_at: string
          status: string
          user_id: string
          username: string
          wallet_address_masked: string
        }[]
      }
      get_admin_withdrawal_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          full_name: string
          gas_fee_nctr: number
          id: string
          nctr_amount: number
          net_amount_nctr: number
          processed_at: string
          status: string
          transaction_hash: string
          user_id: string
          username: string
          wallet_address: string
        }[]
      }
      get_business_data_access_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_count: number
          last_access: string
          table_name: string
        }[]
      }
      get_masked_profile_for_admin: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          email_masked: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
          username: string
          wallet_masked: string
        }[]
      }
      get_password_security_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      get_rate_limit_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          blocked_requests_estimate: number
          top_user_accesses: number
          total_accesses_today: number
          unique_ips_today: number
          unique_users_today: number
        }[]
      }
      get_safe_referral_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          user_id: string
          username: string
        }[]
      }
      get_security_alerts: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          count: number
          first_seen: string
          last_seen: string
          message: string
          severity: string
        }[]
      }
      get_security_compliance_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users_today: number
          critical_events_today: number
          high_risk_events_today: number
          last_activity: string
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
      get_sensitive_profile_data_secure: {
        Args: { target_user_id: string }
        Returns: {
          email: string
          user_id: string
          wallet_address: string
          wallet_connected_at: string
        }[]
      }
      get_super_admin_referral_tracking: {
        Args: { target_user_id?: string }
        Returns: {
          created_at: string
          id: string
          referee_email: string
          referee_name: string
          referral_code: string
          referred_user_id: string
          referrer_email: string
          referrer_ip_address: string
          referrer_name: string
          referrer_user_agent: string
          referrer_user_id: string
          reward_credited: boolean
          rewarded_at: string
          status: string
          total_referrals_by_user: number
        }[]
      }
      get_super_admin_transaction_history: {
        Args: { target_user_id?: string }
        Returns: {
          created_at: string
          description: string
          earning_source: string
          external_transaction_id: string
          id: string
          nctr_amount: number
          opportunity_id: string
          partner_name: string
          purchase_amount: number
          status: string
          transaction_type: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_referrals_with_names: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          referee_email: string
          referee_name: string
          referral_code: string
          referred_user_id: string
          referrer_email: string
          referrer_name: string
          referrer_user_id: string
          reward_credited: boolean
          rewarded_at: string
          status: string
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
      grant_treasury_admin_access: {
        Args: {
          access_reason: string
          expires_in_hours?: number
          role_type: string
          target_user_id: string
        }
        Returns: Json
      }
      has_referral_relationship: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      increment: {
        Args: { x: number }
        Returns: number
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_daily_checkin_available: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_referral_power_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_treasury_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      log_business_data_access: {
        Args: { p_action?: string; p_table_name: string }
        Returns: undefined
      }
      log_financial_data_access: {
        Args: {
          access_reason?: string
          access_type: string
          accessed_fields?: string[]
          record_id: string
          table_name: string
        }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: {
          p_action_type: string
          p_resource_id?: string
          p_resource_table: string
          p_risk_level?: string
        }
        Returns: undefined
      }
      make_user_admin_by_email: {
        Args: { admin_role?: string; user_email: string }
        Returns: string
      }
      mask_sensitive_data: {
        Args: { input_text: string; mask_type?: string }
        Returns: string
      }
      monitor_withdrawal_access_patterns: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_count: number
          last_access: string
          risk_assessment: string
          user_id: string
        }[]
      }
      move_pending_to_available: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      process_daily_checkin: {
        Args: { p_user_id: string }
        Returns: Json
      }
      process_referral_reward: {
        Args: { p_referral_id: string }
        Returns: Json
      }
      revoke_treasury_access: {
        Args: { revocation_reason: string; target_user_id: string }
        Returns: Json
      }
      secure_business_access_check: {
        Args: { p_table_name: string; p_user_id: string }
        Returns: boolean
      }
      ultra_secure_admin_check: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_opportunity_secure: {
        Args: { opportunity_data: Json; opportunity_id: string }
        Returns: {
          affiliate_link: string
          available_nctr_reward: number
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          lock_360_nctr_reward: number
          lock_90_nctr_reward: number
          nctr_reward: number
          opportunity_type: string
          partner_logo_url: string
          partner_name: string
          reward_distribution_type: string
          reward_per_dollar: number
          title: string
          updated_at: string
        }[]
      }
      update_user_status: {
        Args: { user_id: string }
        Returns: Json
      }
      upgrade_all_90locks_to_360: {
        Args: { p_user_id: string }
        Returns: Json
      }
      upgrade_lock_to_360: {
        Args: { p_lock_id: string }
        Returns: Json
      }
      validate_financial_access: {
        Args: { operation_type?: string; required_role?: string }
        Returns: Json
      }
      validate_referral_integrity: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: Json
      }
      validate_referral_request: {
        Args:
          | { p_referee_id: string; p_referrer_id: string }
          | { p_referred_user_id: string; p_referrer_code: string }
        Returns: Json
      }
      validate_referral_request_enhanced: {
        Args: { p_referee_id: string; p_referrer_id: string }
        Returns: Json
      }
      validate_treasury_operation: {
        Args: {
          amount?: number
          operation_type: string
          user_id_param?: string
        }
        Returns: Json
      }
      validate_withdrawal_access: {
        Args: {
          access_type: string
          record_id?: string
          target_user_id: string
        }
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
