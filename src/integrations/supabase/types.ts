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
          admin_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
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
      admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
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
      alliance_token_locks: {
        Row: {
          created_at: string
          id: string
          lock_date: string
          lock_days: number
          opportunity_id: string | null
          status: string
          token_amount: number
          token_name: string
          token_symbol: string
          unlock_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lock_date?: string
          lock_days: number
          opportunity_id?: string | null
          status?: string
          token_amount: number
          token_name: string
          token_symbol: string
          unlock_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lock_date?: string
          lock_days?: number
          opportunity_id?: string | null
          status?: string
          token_amount?: number
          token_name?: string
          token_symbol?: string
          unlock_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_token_locks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "earning_opportunities"
            referencedColumns: ["id"]
          },
        ]
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
      claims_packages: {
        Row: {
          bonus_claims: number | null
          claims_amount: number
          created_at: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_usd: number
          sort_order: number | null
        }
        Insert: {
          bonus_claims?: number | null
          claims_amount: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_usd: number
          sort_order?: number | null
        }
        Update: {
          bonus_claims?: number | null
          claims_amount?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_usd?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      claims_purchases: {
        Row: {
          amount_paid: number
          bonus_claims: number | null
          claims_purchased: number
          created_at: string | null
          id: string
          package_id: string | null
          payment_intent_id: string | null
          payment_method: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          bonus_claims?: number | null
          claims_purchased: number
          created_at?: string | null
          id?: string
          package_id?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          bonus_claims?: number | null
          claims_purchased?: number
          created_at?: string | null
          id?: string
          package_id?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "claims_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crescendo_favorites: {
        Row: {
          created_at: string
          id: string
          reward_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crescendo_favorites_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "crescendo_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crescendo_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crescendo_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crescendo_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crescendo_rewards: {
        Row: {
          claims_cost: number
          contributor_id: string | null
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          quantity_available: number | null
          quantity_claimed: number
          reward_data: Json | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          status: Database["public"]["Enums"]["reward_status"]
          title: string
          updated_at: string
        }
        Insert: {
          claims_cost?: number
          contributor_id?: string | null
          created_at?: string
          description: string
          featured?: boolean
          id?: string
          image_url?: string | null
          quantity_available?: number | null
          quantity_claimed?: number
          reward_data?: Json | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          status?: Database["public"]["Enums"]["reward_status"]
          title: string
          updated_at?: string
        }
        Update: {
          claims_cost?: number
          contributor_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          quantity_available?: number | null
          quantity_claimed?: number
          reward_data?: Json | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          status?: Database["public"]["Enums"]["reward_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crescendo_rewards_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crescendo_transactions: {
        Row: {
          claims_spent: number
          contributor_id: string | null
          created_at: string
          id: string
          member_id: string
          metadata: Json | null
          reward_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
        }
        Insert: {
          claims_spent: number
          contributor_id?: string | null
          created_at?: string
          id?: string
          member_id: string
          metadata?: Json | null
          reward_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
        }
        Update: {
          claims_spent?: number
          contributor_id?: string | null
          created_at?: string
          id?: string
          member_id?: string
          metadata?: Json | null
          reward_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
        }
        Relationships: [
          {
            foreignKeyName: "crescendo_transactions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crescendo_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crescendo_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "crescendo_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_platform_activity_log: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_platform_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkin_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_checkin_date: string | null
          longest_streak: number
          streak_bonuses_earned: number
          total_checkins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_checkin_date?: string | null
          longest_streak?: number
          streak_bonuses_earned?: number
          total_checkins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_checkin_date?: string | null
          longest_streak?: number
          streak_bonuses_earned?: number
          total_checkins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      earning_opportunities: {
        Row: {
          affiliate_link: string | null
          alliance_token_enabled: boolean | null
          alliance_token_lock_days: number | null
          alliance_token_logo_url: string | null
          alliance_token_name: string | null
          alliance_token_ratio: number | null
          alliance_token_symbol: string | null
          alliance_token_type: string | null
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
          alliance_token_enabled?: boolean | null
          alliance_token_lock_days?: number | null
          alliance_token_logo_url?: string | null
          alliance_token_name?: string | null
          alliance_token_ratio?: number | null
          alliance_token_symbol?: string | null
          alliance_token_type?: string | null
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
          alliance_token_enabled?: boolean | null
          alliance_token_lock_days?: number | null
          alliance_token_logo_url?: string | null
          alliance_token_name?: string | null
          alliance_token_ratio?: number | null
          alliance_token_symbol?: string | null
          alliance_token_type?: string | null
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
          {
            foreignKeyName: "earning_opportunities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_opportunities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          page_url: string
          user_id: string | null
          whats_broken: string | null
          whats_working: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_url: string
          user_id?: string | null
          whats_broken?: string | null
          whats_working?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_url?: string
          user_id?: string | null
          whats_broken?: string | null
          whats_working?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
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
      learning_modules: {
        Row: {
          article_content: string | null
          category: string | null
          content_type: string
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          lock_type: string | null
          min_quiz_score: number | null
          nctr_reward: number | null
          requires_quiz: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          article_content?: string | null
          category?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          lock_type?: string | null
          min_quiz_score?: number | null
          nctr_reward?: number | null
          requires_quiz?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          article_content?: string | null
          category?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          lock_type?: string | null
          min_quiz_score?: number | null
          nctr_reward?: number | null
          requires_quiz?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      learning_progress: {
        Row: {
          completed_at: string | null
          content_viewed: boolean | null
          created_at: string | null
          id: string
          module_id: string
          quiz_passed: boolean | null
          quiz_score: number | null
          reward_amount: number | null
          reward_claimed: boolean | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_viewed?: boolean | null
          created_at?: string | null
          id?: string
          module_id: string
          quiz_passed?: boolean | null
          quiz_score?: number | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_viewed?: boolean | null
          created_at?: string | null
          id?: string
          module_id?: string
          quiz_passed?: boolean | null
          quiz_score?: number | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_history: {
        Row: {
          created_at: string
          id: string
          locked_nctr: number
          previous_tier_level: number | null
          previous_tier_name: string | null
          tier_level: number
          tier_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_nctr: number
          previous_tier_level?: number | null
          previous_tier_name?: string | null
          tier_level: number
          tier_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_nctr?: number
          previous_tier_level?: number | null
          previous_tier_name?: string | null
          tier_level?: number
          tier_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          alliance_tokens: Json | null
          available_nctr: number
          created_at: string
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
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
          alliance_tokens?: Json | null
          available_nctr?: number
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
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
          alliance_tokens?: Json | null
          available_nctr?: number
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
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
      nctr_sync_rate_limits: {
        Row: {
          id: string
          last_sync_at: string
          sync_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          id?: string
          last_sync_at?: string
          sync_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          id?: string
          last_sync_at?: string
          sync_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      nctr_transactions: {
        Row: {
          alliance_token_amount: number | null
          alliance_token_symbol: string | null
          auto_lock_type: string | null
          created_at: string
          description: string | null
          earning_source: string | null
          external_transaction_id: string | null
          id: string
          metadata: Json | null
          nctr_amount: number
          opportunity_id: string | null
          partner_name: string | null
          purchase_amount: number | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          alliance_token_amount?: number | null
          alliance_token_symbol?: string | null
          auto_lock_type?: string | null
          created_at?: string
          description?: string | null
          earning_source?: string | null
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          nctr_amount: number
          opportunity_id?: string | null
          partner_name?: string | null
          purchase_amount?: number | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          alliance_token_amount?: number | null
          alliance_token_symbol?: string | null
          auto_lock_type?: string | null
          created_at?: string
          description?: string | null
          earning_source?: string | null
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
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
          {
            foreignKeyName: "partner_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      price_access_log: {
        Row: {
          access_count: number | null
          created_at: string | null
          id: string
          ip_address: unknown
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          created_at: string
          crescendo_synced_at: string | null
          crescendo_user_id: string | null
          email: string | null
          full_name: string | null
          id: string
          last_login_ip: unknown
          nctr_live_email: string | null
          nctr_live_user_id: string | null
          nctr_live_verified: boolean | null
          signup_ip: unknown
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
          wallet_connected_at: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          created_at?: string
          crescendo_synced_at?: string | null
          crescendo_user_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_ip?: unknown
          nctr_live_email?: string | null
          nctr_live_user_id?: string | null
          nctr_live_verified?: boolean | null
          signup_ip?: unknown
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
          wallet_connected_at?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          created_at?: string
          crescendo_synced_at?: string | null
          crescendo_user_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_ip?: unknown
          nctr_live_email?: string | null
          nctr_live_user_id?: string | null
          nctr_live_verified?: boolean | null
          signup_ip?: unknown
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
          wallet_connected_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_paid: number
          claims_amount: number
          created_at: string
          currency: string
          id: string
          package_id: string
          package_name: string
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          claims_amount: number
          created_at?: string
          currency?: string
          id?: string
          package_id: string
          package_name: string
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          claims_amount?: number
          created_at?: string
          currency?: string
          id?: string
          package_id?: string
          package_name?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number | null
          created_at: string | null
          id: string
          module_id: string
          passed: boolean | null
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          module_id: string
          passed?: boolean | null
          score: number
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          module_id?: string
          passed?: boolean | null
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          display_order: number | null
          explanation: string | null
          id: string
          module_id: string
          options: Json
          question_text: string
          question_type: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          module_id: string
          options: Json
          question_text: string
          question_type?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          module_id?: string
          options?: Json
          question_text?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          referral_bonus: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          referral_bonus?: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          referral_bonus?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_shares: {
        Row: {
          bonus_earned: number
          clicks: number
          conversions: number
          id: string
          referral_code: string
          reward_id: string
          share_platform: string | null
          shared_at: string
          user_id: string
        }
        Insert: {
          bonus_earned?: number
          clicks?: number
          conversions?: number
          id?: string
          referral_code: string
          reward_id: string
          share_platform?: string | null
          shared_at?: string
          user_id: string
        }
        Update: {
          bonus_earned?: number
          clicks?: number
          conversions?: number
          id?: string
          referral_code?: string
          reward_id?: string
          share_platform?: string | null
          shared_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_shares_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_submission_changes: {
        Row: {
          change_summary: string | null
          changed_fields: Json
          created_at: string
          id: string
          new_version: number
          previous_version: number
          submission_id: string
        }
        Insert: {
          change_summary?: string | null
          changed_fields: Json
          created_at?: string
          id?: string
          new_version: number
          previous_version: number
          submission_id: string
        }
        Update: {
          change_summary?: string | null
          changed_fields?: Json
          created_at?: string
          id?: string
          new_version?: number
          previous_version?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_submission_changes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "reward_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_submissions: {
        Row: {
          admin_notes: string | null
          brand: string | null
          category: string
          claim_passes_required: number
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_latest_version: boolean
          lock_rate: string
          nctr_value: number
          parent_submission_id: string | null
          reward_type: string
          status: string
          stock_quantity: number | null
          title: string
          updated_at: string
          user_id: string
          version: number
          version_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          brand?: string | null
          category: string
          claim_passes_required?: number
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_latest_version?: boolean
          lock_rate: string
          nctr_value: number
          parent_submission_id?: string | null
          reward_type: string
          status?: string
          stock_quantity?: number | null
          title: string
          updated_at?: string
          user_id: string
          version?: number
          version_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          brand?: string | null
          category?: string
          claim_passes_required?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_latest_version?: boolean
          lock_rate?: string
          nctr_value?: number
          parent_submission_id?: string | null
          reward_type?: string
          status?: string
          stock_quantity?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "reward_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_watchlist: {
        Row: {
          created_at: string
          id: string
          notified: boolean
          reward_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified?: boolean
          reward_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified?: boolean
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_watchlist_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_wishlists: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reward_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reward_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_wishlists_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          brand_id: string | null
          category: string
          cost: number
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          minimum_token_balance: number | null
          sponsor_enabled: boolean
          sponsor_end_date: string | null
          sponsor_link: string | null
          sponsor_logo: string | null
          sponsor_name: string | null
          sponsor_start_date: string | null
          stock_quantity: number | null
          title: string
          token_contract_address: string | null
          token_gated: boolean | null
          token_name: string | null
          token_symbol: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category: string
          cost: number
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          minimum_token_balance?: number | null
          sponsor_enabled?: boolean
          sponsor_end_date?: string | null
          sponsor_link?: string | null
          sponsor_logo?: string | null
          sponsor_name?: string | null
          sponsor_start_date?: string | null
          stock_quantity?: number | null
          title: string
          token_contract_address?: string | null
          token_gated?: boolean | null
          token_name?: string | null
          token_symbol?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category?: string
          cost?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          minimum_token_balance?: number | null
          sponsor_enabled?: boolean
          sponsor_end_date?: string | null
          sponsor_link?: string | null
          sponsor_logo?: string | null
          sponsor_name?: string | null
          sponsor_start_date?: string | null
          stock_quantity?: number | null
          title?: string
          token_contract_address?: string | null
          token_gated?: boolean | null
          token_name?: string | null
          token_symbol?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_claims: {
        Row: {
          claimed_at: string
          id: string
          reward_id: string
          shipping_info: Json | null
          status: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_id: string
          shipping_info?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_id?: string
          shipping_info?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          resource_id?: string | null
          resource_table?: string
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_nctr_per_order: number | null
          min_purchase_for_reward: number | null
          nctr_per_dollar: number
          shopify_store_url: string | null
          store_identifier: string
          store_name: string | null
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_nctr_per_order?: number | null
          min_purchase_for_reward?: number | null
          nctr_per_dollar?: number
          shopify_store_url?: string | null
          store_identifier?: string
          store_name?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_nctr_per_order?: number | null
          min_purchase_for_reward?: number | null
          nctr_per_dollar?: number
          shopify_store_url?: string | null
          store_identifier?: string
          store_name?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      shop_transactions: {
        Row: {
          created_at: string | null
          credited_at: string | null
          currency: string | null
          customer_email: string
          customer_name: string | null
          id: string
          nctr_earned: number
          nctr_per_dollar_at_time: number
          order_id: string
          order_number: string | null
          order_total: number
          shopify_data: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          credited_at?: string | null
          currency?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          nctr_earned: number
          nctr_per_dollar_at_time: number
          order_id: string
          order_number?: string | null
          order_total: number
          shopify_data?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          credited_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          nctr_earned?: number
          nctr_per_dollar_at_time?: number
          order_id?: string
          order_number?: string | null
          order_total?: number
          shopify_data?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_email: string | null
          id: string
          nctr_awarded: number | null
          nctr_credited: boolean | null
          order_data: Json | null
          order_number: string | null
          order_status: string | null
          referral_code: string | null
          referrer_user_id: string | null
          shopify_order_id: string
          total_price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          id?: string
          nctr_awarded?: number | null
          nctr_credited?: boolean | null
          order_data?: Json | null
          order_number?: string | null
          order_status?: string | null
          referral_code?: string | null
          referrer_user_id?: string | null
          shopify_order_id: string
          total_price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          id?: string
          nctr_awarded?: number | null
          nctr_credited?: boolean | null
          order_data?: Json | null
          order_number?: string | null
          order_status?: string | null
          referral_code?: string | null
          referrer_user_id?: string | null
          shopify_order_id?: string
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
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
      sponsors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      status_tiers: {
        Row: {
          badge_color: string | null
          badge_emoji: string | null
          benefits: Json | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          max_nctr_360_locked: number | null
          min_nctr_360_locked: number
          sort_order: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          badge_color?: string | null
          badge_emoji?: string | null
          benefits?: Json | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          max_nctr_360_locked?: number | null
          min_nctr_360_locked?: number
          sort_order?: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          badge_color?: string | null
          badge_emoji?: string | null
          benefits?: Json | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          max_nctr_360_locked?: number | null
          min_nctr_360_locked?: number
          sort_order?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      treasury_admin_roles: {
        Row: {
          access_reason: string | null
          expires_at: string | null
          granted_at: string
          granted_by: string | null
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
          granted_by?: string | null
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
          granted_by?: string | null
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
      unified_activity_log: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      unified_profiles: {
        Row: {
          auth_user_id: string
          available_nctr: number
          avatar_url: string | null
          bio: string | null
          claim_balance: number
          created_at: string | null
          crescendo_data: Json | null
          current_tier_id: string | null
          display_name: string | null
          email: string | null
          garden_data: Json | null
          has_claimed_signup_bonus: boolean
          has_status_access_pass: boolean
          id: string
          last_active_crescendo: string | null
          last_active_garden: string | null
          level: number
          locked_nctr: number
          pending_nctr: number | null
          referral_code: string | null
          referred_by: string | null
          tier_calculated_at: string | null
          total_nctr_earned_shop: number | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          auth_user_id: string
          available_nctr?: number
          avatar_url?: string | null
          bio?: string | null
          claim_balance?: number
          created_at?: string | null
          crescendo_data?: Json | null
          current_tier_id?: string | null
          display_name?: string | null
          email?: string | null
          garden_data?: Json | null
          has_claimed_signup_bonus?: boolean
          has_status_access_pass?: boolean
          id?: string
          last_active_crescendo?: string | null
          last_active_garden?: string | null
          level?: number
          locked_nctr?: number
          pending_nctr?: number | null
          referral_code?: string | null
          referred_by?: string | null
          tier_calculated_at?: string | null
          total_nctr_earned_shop?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          auth_user_id?: string
          available_nctr?: number
          avatar_url?: string | null
          bio?: string | null
          claim_balance?: number
          created_at?: string | null
          crescendo_data?: Json | null
          current_tier_id?: string | null
          display_name?: string | null
          email?: string | null
          garden_data?: Json | null
          has_claimed_signup_bonus?: boolean
          has_status_access_pass?: boolean
          id?: string
          last_active_crescendo?: string | null
          last_active_garden?: string | null
          level?: number
          locked_nctr?: number
          pending_nctr?: number | null
          referral_code?: string | null
          referred_by?: string | null
          tier_calculated_at?: string | null
          total_nctr_earned_shop?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_profiles_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "status_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_portfolio: {
        Row: {
          created_at: string | null
          id: string
          last_synced_at: string | null
          locks: Json | null
          nctr_360_locked: number | null
          nctr_90_locked: number | null
          nctr_balance: number | null
          nctr_unlocked: number | null
          sync_source: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          locks?: Json | null
          nctr_360_locked?: number | null
          nctr_90_locked?: number | null
          nctr_balance?: number | null
          nctr_unlocked?: number | null
          sync_source?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          locks?: Json | null
          nctr_360_locked?: number | null
          nctr_90_locked?: number | null
          nctr_balance?: number | null
          nctr_unlocked?: number | null
          sync_source?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_portfolio_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      webhook_retry_queue: {
        Row: {
          created_at: string | null
          id: string
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          payload: Json
          retry_count: number | null
          updated_at: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload: Json
          retry_count?: number | null
          updated_at?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json
          retry_count?: number | null
          updated_at?: string | null
          webhook_type?: string
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
      public_brands: {
        Row: {
          category: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          website_url: string | null
        }
        Insert: {
          category?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          website_url?: string | null
        }
        Update: {
          category?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      public_brands_safe: {
        Row: {
          category: string | null
          description: string | null
          featured: boolean | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          website_url: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          website_url?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_sample_brands: { Args: never; Returns: string }
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
      award_affiliate_nctr:
        | {
            Args: {
              p_base_nctr_amount: number
              p_earning_source?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_base_nctr_amount: number
              p_brand_name?: string
              p_earning_source?: string
              p_purchase_amount?: number
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
      calculate_unified_user_tier: {
        Args: { p_user_id: string }
        Returns: string
      }
      calculate_user_status: { Args: { user_id: string }; Returns: string }
      check_admin_access_level: {
        Args: { required_level: string }
        Returns: boolean
      }
      check_business_data_rate_limit: {
        Args: { p_table_name: string }
        Returns: boolean
      }
      check_nctr_sync_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_price_access_rate_limit: { Args: never; Returns: boolean }
      check_user_is_admin: { Args: { check_user_id: string }; Returns: boolean }
      check_user_is_admin_secure: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      check_webhook_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip_address: unknown
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      claim_crescendo_reward: {
        Args: { p_metadata?: Json; p_reward_id: string }
        Returns: Json
      }
      claim_reward: {
        Args: { p_reward_id: string; p_shipping_info?: Json }
        Returns: Json
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      commit_all_nctr_to_360lock: { Args: { p_user_id: string }; Returns: Json }
      commit_available_to_360lock: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      create_admin_user_secure: {
        Args: {
          p_access_level: string
          p_access_reason?: string
          p_user_id: string
        }
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
      decrement: { Args: { x: number }; Returns: number }
      delete_opportunity_secure: {
        Args: { opportunity_id: string }
        Returns: boolean
      }
      detect_duplicate_ips: {
        Args: never
        Returns: {
          account_count: number
          created_dates: string[]
          emails: string[]
          ip_address: unknown
          user_ids: string[]
        }[]
      }
      detect_suspicious_activity: {
        Args: never
        Returns: {
          last_activity: string
          suspicious_actions: number
          user_id: string
        }[]
      }
      detect_suspicious_patterns: {
        Args: never
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
      enhanced_price_access_control: { Args: never; Returns: boolean }
      generate_referral_code: { Args: never; Returns: string }
      get_admin_financial_access: { Args: never; Returns: boolean }
      get_admin_financial_access_secure: { Args: never; Returns: boolean }
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
        Args: never
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
        Args: never
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
        Args: never
        Returns: {
          account_status: string
          available_nctr: number
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          last_login_at: string
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
      get_admin_user_portfolio: {
        Args: { target_user_id: string }
        Returns: {
          available_nctr: number
          lock_360_nctr: number
          lock_90_nctr: number
          pending_nctr: number
          total_earned: number
        }[]
      }
      get_admin_user_stats: { Args: { target_user_id: string }; Returns: Json }
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
        Args: never
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
        Args: never
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
      get_password_security_status: { Args: never; Returns: Json }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_public_stats: { Args: never; Returns: Json }
      get_rate_limit_statistics: {
        Args: never
        Returns: {
          blocked_requests_estimate: number
          top_user_accesses: number
          total_accesses_today: number
          unique_ips_today: number
          unique_users_today: number
        }[]
      }
      get_referral_verification_data: {
        Args: never
        Returns: {
          created_at: string
          referee_account_age_days: number
          referee_email: string
          referee_has_transactions: boolean
          referee_name: string
          referee_nctr_earned: number
          referee_profile_complete: boolean
          referee_transaction_count: number
          referee_wallet_connected: boolean
          referral_code: string
          referral_id: string
          referred_user_id: string
          referrer_email: string
          referrer_name: string
          referrer_user_id: string
          reward_credited: boolean
          rewarded_at: string
          same_day_signup: boolean
          status: string
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
        Args: never
        Returns: {
          alert_type: string
          count: number
          first_seen: string
          last_seen: string
          message: string
          severity: string
        }[]
      }
      get_security_compliance_status: { Args: never; Returns: Json }
      get_security_dashboard_data: { Args: never; Returns: Json }
      get_security_summary: {
        Args: never
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
      get_unified_user_with_tier: { Args: { p_user_id: string }; Returns: Json }
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
      grant_user_role: {
        Args: {
          p_expires_at?: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: string
      }
      has_referral_relationship: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment: { Args: { x: number }; Returns: number }
      increment_pending_nctr: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      is_daily_checkin_available: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_email_verified: { Args: { user_id: string }; Returns: boolean }
      is_referral_power_user: { Args: { p_user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_treasury_admin: { Args: { check_user_id: string }; Returns: boolean }
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
        Args: never
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
      process_completed_referral: {
        Args: { p_referred_user_id: string }
        Returns: Json
      }
      process_daily_checkin: { Args: { p_user_id: string }; Returns: Json }
      process_daily_checkin_with_streak: {
        Args: { p_user_id: string }
        Returns: Json
      }
      process_quiz_completion: {
        Args: {
          p_answers: Json
          p_module_id: string
          p_score: number
          p_total_questions: number
          p_user_id: string
        }
        Returns: Json
      }
      process_referral_reward: {
        Args: { p_referral_id: string }
        Returns: Json
      }
      revoke_admin_access_secure: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      revoke_fraudulent_nctr: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      revoke_treasury_access: {
        Args: { revocation_reason: string; target_user_id: string }
        Returns: Json
      }
      revoke_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      search_users_by_email: {
        Args: { search_email: string }
        Returns: {
          account_status: string
          available_nctr: number
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          lock_360_nctr: number
          lock_90_nctr: number
          opportunity_status: string
          total_earned: number
          user_id: string
          username: string
          wallet_address: string
        }[]
      }
      secure_business_access_check: {
        Args: { p_table_name: string; p_user_id: string }
        Returns: boolean
      }
      suspend_user_account: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      toggle_opportunity_status_secure: {
        Args: { opportunity_id: string }
        Returns: {
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }[]
      }
      ultra_secure_admin_check: { Args: never; Returns: boolean }
      update_admin_access_secure: {
        Args: {
          p_new_access_level: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      update_claim_status: {
        Args: { p_claim_id: string; p_status: string }
        Returns: Json
      }
      update_opportunity_admin: {
        Args: { opportunity_data: Json; opportunity_id: string }
        Returns: {
          brand_id: string
          id: string
        }[]
      }
      update_opportunity_secure: {
        Args: { opportunity_data: Json; opportunity_id: string }
        Returns: {
          id: string
        }[]
      }
      update_user_status: { Args: { user_id: string }; Returns: Json }
      upgrade_all_90locks_to_360: { Args: { p_user_id: string }; Returns: Json }
      upgrade_lock_to_360: { Args: { p_lock_id: string }; Returns: Json }
      user_is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      validate_financial_access: {
        Args: { operation_type?: string; required_role?: string }
        Returns: Json
      }
      validate_referral_integrity: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: Json
      }
      validate_referral_request:
        | {
            Args: { p_referred_user_id: string; p_referrer_code: string }
            Returns: Json
          }
        | {
            Args: { p_referee_id: string; p_referrer_id: string }
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
      verify_wallet_for_auth: {
        Args: { p_wallet_address: string }
        Returns: {
          auth_user_id: string
          has_wallet: boolean
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin" | "treasury_admin"
      reward_status: "pending" | "active" | "paused" | "completed"
      reward_type:
        | "access_code"
        | "discount_code"
        | "ticket_code"
        | "experience"
        | "opportunity"
        | "education"
      transaction_status: "completed" | "failed" | "pending"
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
    Enums: {
      app_role: ["user", "admin", "super_admin", "treasury_admin"],
      reward_status: ["pending", "active", "paused", "completed"],
      reward_type: [
        "access_code",
        "discount_code",
        "ticket_code",
        "experience",
        "opportunity",
        "education",
      ],
      transaction_status: ["completed", "failed", "pending"],
    },
  },
} as const
