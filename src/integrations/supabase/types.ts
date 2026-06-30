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
      branding: {
        Row: {
          banner_url: string | null
          id: number
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          id?: number
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          id?: number
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_deletion_log: {
        Row: {
          created_at: string
          deleted_by: string
          deleted_by_nick: string
          id: string
          original_content: string
          original_created_at: string | null
          original_nick: string
          original_user_id: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          deleted_by: string
          deleted_by_nick: string
          id?: string
          original_content: string
          original_created_at?: string | null
          original_nick: string
          original_user_id?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          deleted_by?: string
          deleted_by_nick?: string
          id?: string
          original_content?: string
          original_created_at?: string | null
          original_nick?: string
          original_user_id?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          nick: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          nick: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          nick?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          permissions: Json
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          permissions?: Json
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      login_log: {
        Row: {
          created_at: string
          id: string
          nick: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nick: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nick?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_role: string | null
          full_access: boolean
          id: string
          minecraft_nick: string
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_role?: string | null
          full_access?: boolean
          id: string
          minecraft_nick: string
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_role?: string | null
          full_access?: boolean
          id?: string
          minecraft_nick?: string
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recruitments: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          requirements: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          id?: string
          requirements?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          requirements?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          nick: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nick: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nick?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          board_role: string
          created_at: string
          created_by: string
          created_by_nick: string
          description: string
          id: string
          priority: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          board_role: string
          created_at?: string
          created_by: string
          created_by_nick: string
          description?: string
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          board_role?: string
          created_at?: string
          created_by?: string
          created_by_nick?: string
          description?: string
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          discord: string | null
          email: string | null
          id: string
          instagram: string | null
          minecraft_nick: string
          role_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          minecraft_nick: string
          role_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          minecraft_nick?: string
          role_name?: string
          sort_order?: number
          updated_at?: string
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
      voice_participants: {
        Row: {
          deafened: boolean
          force_muted: boolean
          id: string
          joined_at: string
          muted: boolean
          nick: string
          room_id: string
          user_id: string
        }
        Insert: {
          deafened?: boolean
          force_muted?: boolean
          id?: string
          joined_at?: string
          muted?: boolean
          nick: string
          room_id: string
          user_id: string
        }
        Update: {
          deafened?: boolean
          force_muted?: boolean
          id?: string
          joined_at?: string
          muted?: boolean
          nick?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "voice_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_rooms: {
        Row: {
          banned_user_ids: string[]
          created_at: string
          created_by: string
          id: string
          locked: boolean
          max_users: number | null
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          banned_user_ids?: string[]
          created_at?: string
          created_by: string
          id?: string
          locked?: boolean
          max_users?: number | null
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          banned_user_ids?: string[]
          created_at?: string
          created_by?: string
          id?: string
          locked?: boolean
          max_users?: number | null
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      vote_links: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_full_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "vedeni" | "admin" | "developer"
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
      app_role: ["vedeni", "admin", "developer"],
    },
  },
} as const
