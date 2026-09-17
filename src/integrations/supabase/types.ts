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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          path: string | null
          platform: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          path?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          path?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          accent_color: string
          ai_enabled: boolean
          android_force_update: boolean
          android_latest_version: string | null
          android_min_version: string | null
          android_update_url: string | null
          announcement_level: string
          avatar_upload_enabled: boolean
          banner_text: string | null
          default_daily_goal_hours: number
          default_weekly_goal_hours: number
          email_auth_enabled: boolean
          favicon_url: string | null
          google_auth_enabled: boolean
          id: boolean
          landing_enabled: boolean
          logo_url: string | null
          maintenance_note: string | null
          manual_log_enabled: boolean
          onboarding_require_subjects: boolean
          one_tap_enabled: boolean
          push_enabled: boolean
          signup_enabled: boolean
          site_name: string
          support_email: string | null
          tagline: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          ai_enabled?: boolean
          android_force_update?: boolean
          android_latest_version?: string | null
          android_min_version?: string | null
          android_update_url?: string | null
          announcement_level?: string
          avatar_upload_enabled?: boolean
          banner_text?: string | null
          default_daily_goal_hours?: number
          default_weekly_goal_hours?: number
          email_auth_enabled?: boolean
          favicon_url?: string | null
          google_auth_enabled?: boolean
          id?: boolean
          landing_enabled?: boolean
          logo_url?: string | null
          maintenance_note?: string | null
          manual_log_enabled?: boolean
          onboarding_require_subjects?: boolean
          one_tap_enabled?: boolean
          push_enabled?: boolean
          signup_enabled?: boolean
          site_name?: string
          support_email?: string | null
          tagline?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          ai_enabled?: boolean
          android_force_update?: boolean
          android_latest_version?: string | null
          android_min_version?: string | null
          android_update_url?: string | null
          announcement_level?: string
          avatar_upload_enabled?: boolean
          banner_text?: string | null
          default_daily_goal_hours?: number
          default_weekly_goal_hours?: number
          email_auth_enabled?: boolean
          favicon_url?: string | null
          google_auth_enabled?: boolean
          id?: boolean
          landing_enabled?: boolean
          logo_url?: string | null
          maintenance_note?: string | null
          manual_log_enabled?: boolean
          onboarding_require_subjects?: boolean
          one_tap_enabled?: boolean
          push_enabled?: boolean
          signup_enabled?: boolean
          site_name?: string
          support_email?: string | null
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      avatar_presets: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      chapter_learning_state: {
        Row: {
          chapter_id: string | null
          chapter_name: string
          class_minutes: number
          class_sessions: number
          created_at: string
          first_pass_completed_at: string | null
          id: string
          last_recall: number | null
          last_studied_at: string | null
          next_review_at: string
          practice_minutes: number
          practice_sessions: number
          reading_minutes: number
          reading_sessions: number
          recall_samples: number
          review_stage: number
          revision_minutes: number
          revision_sessions: number
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          chapter_name: string
          class_minutes?: number
          class_sessions?: number
          created_at?: string
          first_pass_completed_at?: string | null
          id?: string
          last_recall?: number | null
          last_studied_at?: string | null
          next_review_at?: string
          practice_minutes?: number
          practice_sessions?: number
          reading_minutes?: number
          reading_sessions?: number
          recall_samples?: number
          review_stage?: number
          revision_minutes?: number
          revision_sessions?: number
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          chapter_name?: string
          class_minutes?: number
          class_sessions?: number
          created_at?: string
          first_pass_completed_at?: string | null
          id?: string
          last_recall?: number | null
          last_studied_at?: string | null
          next_review_at?: string
          practice_minutes?: number
          practice_sessions?: number
          reading_minutes?: number
          reading_sessions?: number
          recall_samples?: number
          review_stage?: number
          revision_minutes?: number
          revision_sessions?: number
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_learning_state_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_learning_state_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_subtopics: {
        Row: {
          chapter_id: string
          created_at: string
          estimated_minutes: number
          first_pass_done: boolean
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          estimated_minutes?: number
          first_pass_done?: boolean
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          estimated_minutes?: number
          first_pass_done?: boolean
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_subtopics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          archived: boolean
          created_at: string
          difficulty: number
          estimated_minutes: number
          first_pass_done: boolean
          id: string
          name: string
          position: number
          subject_id: string
          total_units: number | null
          units_done: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          difficulty?: number
          estimated_minutes?: number
          first_pass_done?: boolean
          id?: string
          name: string
          position?: number
          subject_id: string
          total_units?: number | null
          units_done?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          difficulty?: number
          estimated_minutes?: number
          first_pass_done?: boolean
          id?: string
          name?: string
          position?: number
          subject_id?: string
          total_units?: number | null
          units_done?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_note_revision_state: {
        Row: {
          chapter_id: string | null
          chapter_name: string | null
          class_id: string
          created_at: string
          id: string
          last_revised_at: string | null
          next_review_at: string
          review_stage: number
          revisions_done: number
          subject_id: string | null
          target_revisions: number
          title: string
          total_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          chapter_name?: string | null
          class_id: string
          created_at?: string
          id?: string
          last_revised_at?: string | null
          next_review_at?: string
          review_stage?: number
          revisions_done?: number
          subject_id?: string | null
          target_revisions?: number
          title: string
          total_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          chapter_name?: string | null
          class_id?: string
          created_at?: string
          id?: string
          last_revised_at?: string | null
          next_review_at?: string
          review_stage?: number
          revisions_done?: number
          subject_id?: string | null
          target_revisions?: number
          title?: string
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_note_revision_state_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_note_revision_state_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "online_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_note_revision_state_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_study_plan_items: {
        Row: {
          cancelled_at: string | null
          chapter_id: string | null
          chapter_name: string | null
          class_id: string | null
          completed_at: string | null
          completed_session_id: string | null
          created_at: string
          id: string
          next_review_at: string | null
          pinned: boolean
          plan_date: string
          priority: number
          rank_score: number
          review_stage: number | null
          scheduled_end: string | null
          scheduled_start: string | null
          session_kind: string
          skipped_at: string | null
          source: string
          status: string
          subject_id: string | null
          subject_name: string | null
          subtopic_id: string | null
          target_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          chapter_id?: string | null
          chapter_name?: string | null
          class_id?: string | null
          completed_at?: string | null
          completed_session_id?: string | null
          created_at?: string
          id?: string
          next_review_at?: string | null
          pinned?: boolean
          plan_date: string
          priority?: number
          rank_score?: number
          review_stage?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          session_kind?: string
          skipped_at?: string | null
          source?: string
          status?: string
          subject_id?: string | null
          subject_name?: string | null
          subtopic_id?: string | null
          target_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          chapter_id?: string | null
          chapter_name?: string | null
          class_id?: string | null
          completed_at?: string | null
          completed_session_id?: string | null
          created_at?: string
          id?: string
          next_review_at?: string | null
          pinned?: boolean
          plan_date?: string
          priority?: number
          rank_score?: number
          review_stage?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          session_kind?: string
          skipped_at?: string | null
          source?: string
          status?: string
          subject_id?: string | null
          subject_name?: string | null
          subtopic_id?: string | null
          target_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_study_plan_items_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_study_plan_items_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "online_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_study_plan_items_completed_session_id_fkey"
            columns: ["completed_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_study_plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_study_plan_items_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "chapter_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          last_seen_at: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string | null
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legacy_user_claims: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          payload: Json
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          payload: Json
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          payload?: Json
        }
        Relationships: []
      }
      motivations: {
        Row: {
          author: string | null
          body: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          month: number | null
          title: string
        }
        Insert: {
          author?: string | null
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          month?: number | null
          title?: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          month?: number | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_path: string | null
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          kind: string
          push_sent: boolean
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          action_path?: string | null
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          push_sent?: boolean
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          action_path?: string | null
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          push_sent?: boolean
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      online_classes: {
        Row: {
          chapter_id: string | null
          chapter_name: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          mode: string
          notes_taken: boolean
          scheduled_at: string | null
          status: string
          subject_id: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          chapter_name?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mode?: string
          notes_taken?: boolean
          scheduled_at?: string | null
          status?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          chapter_name?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mode?: string
          notes_taken?: boolean
          scheduled_at?: string | null
          status?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_classes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          avg_study_hours: number | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          onboarded: boolean
          onboarded_at: string | null
          phone: string | null
          sign_in_count: number
          timezone: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          avg_study_hours?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          last_seen_at?: string | null
          onboarded?: boolean
          onboarded_at?: string | null
          phone?: string | null
          sign_in_count?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          avg_study_hours?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          onboarded?: boolean
          onboarded_at?: string | null
          phone?: string | null
          sign_in_count?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_goals: {
        Row: {
          created_at: string
          magazine_monthly_minutes: number
          newspaper_daily_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          magazine_monthly_minutes?: number
          newspaper_daily_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          magazine_monthly_minutes?: number
          newspaper_daily_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_logs: {
        Row: {
          created_at: string
          id: string
          kind: string
          log_date: string
          minutes: number
          note: string | null
          sittings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          log_date: string
          minutes?: number
          note?: string | null
          sittings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          log_date?: string
          minutes?: number
          note?: string | null
          sittings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_breaks: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          kind: string
          note: string | null
          session_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          session_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          session_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_breaks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_outcomes: {
        Row: {
          chapter_id: string | null
          content_completed_pct: number | null
          created_at: string
          id: string
          is_reread: boolean
          kind: string
          net_focus_minutes: number | null
          notes: string | null
          recall_rating: number | null
          revision_result: string | null
          session_id: string
          subtopic_id: string | null
          unit_label: string | null
          units_done: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          content_completed_pct?: number | null
          created_at?: string
          id?: string
          is_reread?: boolean
          kind: string
          net_focus_minutes?: number | null
          notes?: string | null
          recall_rating?: number | null
          revision_result?: string | null
          session_id: string
          subtopic_id?: string | null
          unit_label?: string | null
          units_done?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          content_completed_pct?: number | null
          created_at?: string
          id?: string
          is_reread?: boolean
          kind?: string
          net_focus_minutes?: number | null
          notes?: string | null
          recall_rating?: number | null
          revision_result?: string | null
          session_id?: string
          subtopic_id?: string | null
          unit_label?: string | null
          units_done?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_outcomes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_outcomes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_outcomes_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "chapter_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          auto_closed: boolean
          break_minutes: number
          break_started_at: string | null
          break_type: string | null
          category: string | null
          chapter: string | null
          chapter_id: string | null
          created_at: string
          duration_minutes: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_running: boolean
          kind: string
          notes: string | null
          planned_end_at: string | null
          started_at: string
          subject_id: string | null
          subject_name: string | null
          subtopic_id: string | null
          topic: string | null
          total_break_seconds: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          auto_closed?: boolean
          break_minutes?: number
          break_started_at?: string | null
          break_type?: string | null
          category?: string | null
          chapter?: string | null
          chapter_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_running?: boolean
          kind?: string
          notes?: string | null
          planned_end_at?: string | null
          started_at?: string
          subject_id?: string | null
          subject_name?: string | null
          subtopic_id?: string | null
          topic?: string | null
          total_break_seconds?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          auto_closed?: boolean
          break_minutes?: number
          break_started_at?: string | null
          break_type?: string | null
          category?: string | null
          chapter?: string | null
          chapter_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_running?: boolean
          kind?: string
          notes?: string | null
          planned_end_at?: string | null
          started_at?: string
          subject_id?: string | null
          subject_name?: string | null
          subtopic_id?: string | null
          topic?: string | null
          total_break_seconds?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "chapter_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_catalog: {
        Row: {
          chapters: Json
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sort_order: number
          stream: string
          updated_at: string
        }
        Insert: {
          chapters?: Json
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sort_order?: number
          stream?: string
          updated_at?: string
        }
        Update: {
          chapters?: Json
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sort_order?: number
          stream?: string
          updated_at?: string
        }
        Relationships: []
      }
      subject_targets: {
        Row: {
          auto_created: boolean
          created_at: string
          daily_chapters: number
          daily_minutes: number
          daily_questions: number
          daily_topics: number
          id: string
          monthly_chapters: number
          monthly_minutes: number
          monthly_questions: number
          monthly_topics: number
          subject_id: string
          updated_at: string
          user_id: string
          weekly_chapters: number
          weekly_minutes: number
          weekly_questions: number
          weekly_topics: number
        }
        Insert: {
          auto_created?: boolean
          created_at?: string
          daily_chapters?: number
          daily_minutes?: number
          daily_questions?: number
          daily_topics?: number
          id?: string
          monthly_chapters?: number
          monthly_minutes?: number
          monthly_questions?: number
          monthly_topics?: number
          subject_id: string
          updated_at?: string
          user_id: string
          weekly_chapters?: number
          weekly_minutes?: number
          weekly_questions?: number
          weekly_topics?: number
        }
        Update: {
          auto_created?: boolean
          created_at?: string
          daily_chapters?: number
          daily_minutes?: number
          daily_questions?: number
          daily_topics?: number
          id?: string
          monthly_chapters?: number
          monthly_minutes?: number
          monthly_questions?: number
          monthly_topics?: number
          subject_id?: string
          updated_at?: string
          user_id?: string
          weekly_chapters?: number
          weekly_minutes?: number
          weekly_questions?: number
          weekly_topics?: number
        }
        Relationships: [
          {
            foreignKeyName: "subject_targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          chapters: Json
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
          weekly_target_hours: number
        }
        Insert: {
          chapters?: Json
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
          weekly_target_hours?: number
        }
        Update: {
          chapters?: Json
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          weekly_target_hours?: number
        }
        Relationships: []
      }
      targets: {
        Row: {
          chapter_id: string | null
          chapters: Json
          created_at: string
          daily_hours: number
          deadline: string | null
          id: string
          is_active: boolean
          subject_id: string | null
          title: string
          user_id: string
          weekly_hours: number
        }
        Insert: {
          chapter_id?: string | null
          chapters?: Json
          created_at?: string
          daily_hours?: number
          deadline?: string | null
          id?: string
          is_active?: boolean
          subject_id?: string | null
          title: string
          user_id: string
          weekly_hours?: number
        }
        Update: {
          chapter_id?: string | null
          chapters?: Json
          created_at?: string
          daily_hours?: number
          deadline?: string | null
          id?: string
          is_active?: boolean
          subject_id?: string | null
          title?: string
          user_id?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "targets_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          chapter_id: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          questions_attempted: number
          questions_correct: number
          questions_total: number
          scope: string
          score: number | null
          session_id: string | null
          subject_id: string | null
          subtopic_id: string | null
          taken_at: string
          updated_at: string
          user_id: string
          weak_topics: string[]
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          questions_attempted?: number
          questions_correct?: number
          questions_total: number
          scope?: string
          score?: number | null
          session_id?: string | null
          subject_id?: string | null
          subtopic_id?: string | null
          taken_at?: string
          updated_at?: string
          user_id: string
          weak_topics?: string[]
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          questions_attempted?: number
          questions_correct?: number
          questions_total?: number
          scope?: string
          score?: number | null
          session_id?: string | null
          subject_id?: string | null
          subtopic_id?: string | null
          taken_at?: string
          updated_at?: string
          user_id?: string
          weak_topics?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "chapter_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_blocks: {
        Row: {
          chapter_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          kind: string
          location: string | null
          sort_order: number
          start_time: string
          subject_id: string | null
          title: string
          user_id: string
          week_parity: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          kind?: string
          location?: string | null
          sort_order?: number
          start_time: string
          subject_id?: string | null
          title: string
          user_id: string
          week_parity?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          kind?: string
          location?: string | null
          sort_order?: number
          start_time?: string
          subject_id?: string | null
          title?: string
          user_id?: string
          week_parity?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_blocks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_autopilot: boolean
          ai_tone: string
          auto_stop_hours: number
          daily_goal_hours: number
          updated_at: string
          user_id: string
          week_starts_monday: boolean
          weekly_goal_hours: number
          widget_layout: Json
        }
        Insert: {
          ai_autopilot?: boolean
          ai_tone?: string
          auto_stop_hours?: number
          daily_goal_hours?: number
          updated_at?: string
          user_id: string
          week_starts_monday?: boolean
          weekly_goal_hours?: number
          widget_layout?: Json
        }
        Update: {
          ai_autopilot?: boolean
          ai_tone?: string
          auto_stop_hours?: number
          daily_goal_hours?: number
          updated_at?: string
          user_id?: string
          week_starts_monday?: boolean
          weekly_goal_hours?: number
          widget_layout?: Json
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          best_streak: number
          id: string
          last_streak_at: string | null
          level: number
          streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          id?: string
          last_streak_at?: string | null
          level?: number
          streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          id?: string
          last_streak_at?: string | null
          level?: number
          streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_my_subject_targets: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_reading: {
        Args: { _kind: string; _minutes: number }
        Returns: {
          created_at: string
          id: string
          kind: string
          log_date: string
          minutes: number
          note: string | null
          sittings: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reading_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_plan_item_status: {
        Args: { _item_id: string; _status: string }
        Returns: number
      }
      touch_last_seen: { Args: never; Returns: undefined }
      undo_reading: { Args: { _kind: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
