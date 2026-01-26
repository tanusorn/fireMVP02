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
      daily_status_history: {
        Row: {
          created_at: string | null
          date: string
          id: string
          status: Database["public"]["Enums"]["user_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          status: Database["public"]["Enums"]["user_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["user_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string | null
          equipment_type: string
          id: string
          operation_center: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_type: string
          id?: string
          operation_center: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_type?: string
          id?: string
          operation_center?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_operation_center_fkey"
            columns: ["operation_center"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["code"]
          },
        ]
      }
      fire_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lat: number
          lon: number
          report_code: string
          report_name: string | null
          simulation_params: Json | null
          simulation_result: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lat: number
          lon: number
          report_code: string
          report_name?: string | null
          simulation_params?: Json | null
          simulation_result?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lat?: number
          lon?: number
          report_code?: string
          report_name?: string | null
          simulation_params?: Json | null
          simulation_result?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          cell_status: Json
          created_at: string
          created_by: string
          fire_status: string
          id: string
          lat: number
          lon: number
          optimization_result: Json | null
          report_code: string | null
          report_id: string | null
          ros_statistics: Json
          severity: string
          simulation_params: Json
          starting_point: Json
          status: string
          status_history: Json
          updated_at: string
          wind_info: Json
          zone: string
        }
        Insert: {
          cell_status?: Json
          created_at?: string
          created_by: string
          fire_status?: string
          id?: string
          lat: number
          lon: number
          optimization_result?: Json | null
          report_code?: string | null
          report_id?: string | null
          ros_statistics?: Json
          severity?: string
          simulation_params?: Json
          starting_point?: Json
          status?: string
          status_history?: Json
          updated_at?: string
          wind_info?: Json
          zone: string
        }
        Update: {
          cell_status?: Json
          created_at?: string
          created_by?: string
          fire_status?: string
          id?: string
          lat?: number
          lon?: number
          optimization_result?: Json | null
          report_code?: string | null
          report_id?: string | null
          ros_statistics?: Json
          severity?: string
          simulation_params?: Json
          starting_point?: Json
          status?: string
          status_history?: Json
          updated_at?: string
          wind_info?: Json
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fire_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean
          report_id: string | null
          sender_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean
          report_id?: string | null
          sender_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean
          report_id?: string | null
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fire_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_centers: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_status: Database["public"]["Enums"]["user_status"]
          email: string
          id: string
          name: string
          operation_center: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["user_status"]
          email: string
          id: string
          name: string
          operation_center?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["user_status"]
          email?: string
          id?: string
          name?: string
          operation_center?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_operation_center_fkey"
            columns: ["operation_center"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["code"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_status: Database["public"]["Enums"]["user_status"]
          id: string
          name: string
          operation_center: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["user_status"]
          id: string
          name: string
          operation_center?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["user_status"]
          id?: string
          name?: string
          operation_center?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_operation_center_fkey"
            columns: ["operation_center"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["code"]
          },
        ]
      }
      report_zones: {
        Row: {
          allocation_result: Json | null
          created_at: string | null
          firebreak_area_m2: number
          id: string
          report_id: string | null
          zone_name: string
        }
        Insert: {
          allocation_result?: Json | null
          created_at?: string | null
          firebreak_area_m2: number
          id?: string
          report_id?: string | null
          zone_name: string
        }
        Update: {
          allocation_result?: Json | null
          created_at?: string | null
          firebreak_area_m2?: number
          id?: string
          report_id?: string | null
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_zones_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fire_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      user_status: "available" | "unavailable"
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
      app_role: ["admin", "user"],
      user_status: ["available", "unavailable"],
    },
  },
} as const
