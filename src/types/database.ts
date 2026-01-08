export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          linkedin_profile_url: string | null
          linkedin_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          linkedin_profile_url?: string | null
          linkedin_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          linkedin_profile_url?: string | null
          linkedin_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      career_experiences: {
        Row: {
          id: string
          user_id: string
          company_name: string
          job_title: string
          start_date: string
          end_date: string | null
          description: string | null
          skills: string[]
          is_current: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          job_title: string
          start_date: string
          end_date?: string | null
          description?: string | null
          skills?: string[]
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          job_title?: string
          start_date?: string
          end_date?: string | null
          description?: string | null
          skills?: string[]
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      recruitment_processes: {
        Row: {
          id: string
          user_id: string
          company_name: string
          job_title: string
          job_url: string | null
          status: 'upcoming' | 'in_progress' | 'completed' | 'rejected' | 'offer_received' | 'accepted'
          applied_date: string | null
          source: 'linkedin' | 'referral' | 'direct' | 'other'
          notes: string | null
          hiring_manager_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          job_title: string
          job_url?: string | null
          status?: 'upcoming' | 'in_progress' | 'completed' | 'rejected' | 'offer_received' | 'accepted'
          applied_date?: string | null
          source?: 'linkedin' | 'referral' | 'direct' | 'other'
          notes?: string | null
          hiring_manager_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          job_title?: string
          job_url?: string | null
          status?: 'upcoming' | 'in_progress' | 'completed' | 'rejected' | 'offer_received' | 'accepted'
          applied_date?: string | null
          source?: 'linkedin' | 'referral' | 'direct' | 'other'
          notes?: string | null
          hiring_manager_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      process_steps: {
        Row: {
          id: string
          process_id: string
          step_number: number
          step_type: 'phone_screen' | 'technical' | 'behavioral' | 'onsite' | 'offer' | 'other' | 'output'
          scheduled_date: string | null
          status: 'upcoming' | 'completed' | 'cancelled'
          objectives: string[]
          notes: string | null
          outcome: string | null
          went_well: string[]
          to_improve: string[]
          linked_step_id: string | null
          output_score: number | null
          output_score_brief: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          process_id: string
          step_number: number
          step_type: 'phone_screen' | 'technical' | 'behavioral' | 'onsite' | 'offer' | 'other' | 'output'
          scheduled_date?: string | null
          status?: 'upcoming' | 'completed' | 'cancelled'
          objectives?: string[]
          notes?: string | null
          outcome?: string | null
          went_well?: string[]
          to_improve?: string[]
          linked_step_id?: string | null
          output_score?: number | null
          output_score_brief?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          process_id?: string
          step_number?: number
          step_type?: 'phone_screen' | 'technical' | 'behavioral' | 'onsite' | 'offer' | 'other' | 'output'
          scheduled_date?: string | null
          status?: 'upcoming' | 'completed' | 'cancelled'
          objectives?: string[]
          notes?: string | null
          outcome?: string | null
          went_well?: string[]
          to_improve?: string[]
          linked_step_id?: string | null
          output_score?: number | null
          output_score_brief?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      step_contacts: {
        Row: {
          id: string
          step_id: string
          name: string
          role: string | null
          linkedin_url: string | null
          email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          step_id: string
          name: string
          role?: string | null
          linkedin_url?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          step_id?: string
          name?: string
          role?: string | null
          linkedin_url?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      network_connections: {
        Row: {
          id: string
          user_id: string
          name: string
          linkedin_url: string | null
          company: string | null
          role: string | null
          relationship_strength: 'strong' | 'medium' | 'weak'
          can_help_with: string[]
          last_contacted: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          linkedin_url?: string | null
          company?: string | null
          role?: string | null
          relationship_strength?: 'strong' | 'medium' | 'weak'
          can_help_with?: string[]
          last_contacted?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          linkedin_url?: string | null
          company?: string | null
          role?: string | null
          relationship_strength?: 'strong' | 'medium' | 'weak'
          can_help_with?: string[]
          last_contacted?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      coaches: {
        Row: {
          id: string
          user_id: string
          specialties: string[]
          hourly_rate: number
          bio: string | null
          availability_status: 'available' | 'busy' | 'unavailable'
          rating: number | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          specialties?: string[]
          hourly_rate: number
          bio?: string | null
          availability_status?: 'available' | 'busy' | 'unavailable'
          rating?: number | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          specialties?: string[]
          hourly_rate?: number
          bio?: string | null
          availability_status?: 'available' | 'busy' | 'unavailable'
          rating?: number | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      coaching_sessions: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          step_id: string | null
          scheduled_at: string
          duration_minutes: number
          session_rate: number
          platform_fee: number
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status: 'pending' | 'paid' | 'refunded'
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          step_id?: string | null
          scheduled_at: string
          duration_minutes: number
          session_rate: number
          platform_fee: number
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status?: 'pending' | 'paid' | 'refunded'
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          step_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          session_rate?: number
          platform_fee?: number
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          payment_status?: 'pending' | 'paid' | 'refunded'
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      coach_reviews: {
        Row: {
          id: string
          coach_id: string
          session_id: string
          reviewer_id: string
          rating: number
          review_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          session_id: string
          reviewer_id: string
          rating: number
          review_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          session_id?: string
          reviewer_id?: string
          rating?: number
          review_text?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
