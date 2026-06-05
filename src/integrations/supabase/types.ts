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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string
          email: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          content_type: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          match_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          match_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          match_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_moderation: {
        Row: {
          ai_response: Json | null
          created_at: string
          id: string
          photo_id: string
          photo_url: string
          reason: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          user_id: string
        }
        Insert: {
          ai_response?: Json | null
          created_at?: string
          id?: string
          photo_id: string
          photo_url: string
          reason?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          user_id: string
        }
        Update: {
          ai_response?: Json | null
          created_at?: string
          id?: string
          photo_id?: string
          photo_url?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          user_id?: string
        }
        Relationships: []
      }
      popular_cities: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          created_at: string
          id: string
          moderation_reason: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          photo_url: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moderation_reason?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          photo_url: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          moderation_reason?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          photo_url?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      profile_prompts: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          position?: number
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_videos: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          storage_path: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          storage_path: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          storage_path?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          viewed_at: string
          viewed_id: string
          viewer_id: string
        }
        Insert: {
          id?: string
          viewed_at?: string
          viewed_id: string
          viewer_id: string
        }
        Update: {
          id?: string
          viewed_at?: string
          viewed_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          boost_count: number
          boost_until: string | null
          children: string | null
          city: string | null
          created_at: string
          drinking: string | null
          education: string | null
          gender: string | null
          height_cm: number | null
          id: string
          interests: string[] | null
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          name: string
          occupation: string | null
          onboarding_completed: boolean
          premium_plan: string | null
          premium_until: string | null
          smoking: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          zodiac: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          boost_count?: number
          boost_until?: string | null
          children?: string | null
          city?: string | null
          created_at?: string
          drinking?: string | null
          education?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          occupation?: string | null
          onboarding_completed?: boolean
          premium_plan?: string | null
          premium_until?: string | null
          smoking?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          zodiac?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          boost_count?: number
          boost_until?: string | null
          children?: string | null
          city?: string | null
          created_at?: string
          drinking?: string | null
          education?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          occupation?: string | null
          onboarding_completed?: boolean
          premium_plan?: string | null
          premium_until?: string | null
          smoking?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          zodiac?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: []
      }
      selfie_verifications: {
        Row: {
          ai_response: Json | null
          challenge_gesture: string
          created_at: string
          id: string
          reason: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          ai_response?: Json | null
          challenge_gesture: string
          created_at?: string
          id?: string
          reason?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          ai_response?: Json | null
          challenge_gesture?: string
          created_at?: string
          id?: string
          reason?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string
          direction: string
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      public_profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          gender: string | null
          id: string | null
          interests: string[] | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          interests?: string[] | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          interests?: string[] | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      count_search_profiles: {
        Args: {
          city_query: string
          exclude_ids: string[]
          gender_filter: string
          max_age: number
          min_age: number
          radius_km?: number
          user_lat?: number
          user_lng?: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_match_member: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_city: { Args: { input: string }; Returns: string }
      record_profile_view: { Args: { _viewed_id: string }; Returns: undefined }
      search_profiles: {
        Args: {
          city_query: string
          exclude_ids: string[]
          gender_filter: string
          max_age: number
          min_age: number
          radius_km?: number
          user_lat?: number
          user_lng?: number
        }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          boost_until: string
          children: string
          city: string
          created_at: string
          distance_km: number
          drinking: string
          education: string
          gender: string
          height_cm: number
          id: string
          interests: string[]
          is_verified: boolean
          latitude: number
          longitude: number
          name: string
          occupation: string
          smoking: string
          updated_at: string
          user_id: string
          zodiac: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      moderation_status: "pending" | "approved" | "rejected"
      report_reason:
        | "inappropriate_photos"
        | "fake_profile"
        | "harassment"
        | "spam"
        | "underage"
        | "offensive_behavior"
        | "other"
      report_status: "pending" | "reviewed" | "dismissed" | "action_taken"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      moderation_status: ["pending", "approved", "rejected"],
      report_reason: [
        "inappropriate_photos",
        "fake_profile",
        "harassment",
        "spam",
        "underage",
        "offensive_behavior",
        "other",
      ],
      report_status: ["pending", "reviewed", "dismissed", "action_taken"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
