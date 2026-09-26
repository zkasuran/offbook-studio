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
      bookings: {
        Row: {
          actor_email: string
          actor_name: string
          checkout_session_id: string | null
          created_at: string
          deposit_cents: number
          deposit_status: Database["public"]["Enums"]["deposit_state"]
          id: string
          notes: string | null
          service_id: string
          slot_id: string
          source: string
          status: Database["public"]["Enums"]["booking_state"]
        }
        Insert: {
          actor_email: string
          actor_name: string
          checkout_session_id?: string | null
          created_at?: string
          deposit_cents?: number
          deposit_status?: Database["public"]["Enums"]["deposit_state"]
          id?: string
          notes?: string | null
          service_id: string
          slot_id: string
          source?: string
          status?: Database["public"]["Enums"]["booking_state"]
        }
        Update: {
          actor_email?: string
          actor_name?: string
          checkout_session_id?: string | null
          created_at?: string
          deposit_cents?: number
          deposit_status?: Database["public"]["Enums"]["deposit_state"]
          id?: string
          notes?: string | null
          service_id?: string
          slot_id?: string
          source?: string
          status?: Database["public"]["Enums"]["booking_state"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_messages: {
        Row: {
          auto_answered: boolean
          body: string
          created_at: string
          id: string
          intent: string | null
          reply: string | null
        }
        Insert: {
          auto_answered?: boolean
          body: string
          created_at?: string
          id?: string
          intent?: string | null
          reply?: string | null
        }
        Update: {
          auto_answered?: boolean
          body?: string
          created_at?: string
          id?: string
          intent?: string | null
          reply?: string | null
        }
        Relationships: []
      }
      outbound_emails: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          delivered: boolean
          id: string
          kind: string
          provider_error: string | null
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string
          delivered?: boolean
          id?: string
          kind?: string
          provider_error?: string | null
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          delivered?: boolean
          id?: string
          kind?: string
          provider_error?: string | null
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_emails_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          deposit_cents: number
          description: string
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          deposit_cents: number
          description?: string
          duration_minutes: number
          id?: string
          name: string
          price_cents: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          deposit_cents?: number
          description?: string
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
        }
        Relationships: []
      }
      slots: {
        Row: {
          created_at: string
          hold_expires_at: string | null
          hold_token: string | null
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["slot_status"]
        }
        Insert: {
          created_at?: string
          hold_expires_at?: string | null
          hold_token?: string | null
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["slot_status"]
        }
        Update: {
          created_at?: string
          hold_expires_at?: string | null
          hold_token?: string | null
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["slot_status"]
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
      waitlist: {
        Row: {
          actor_email: string
          actor_name: string
          claim_token: string | null
          created_at: string
          desired_window: string
          id: string
          notified_at: string | null
          offer_expires_at: string | null
          offered_slot_id: string | null
          status: Database["public"]["Enums"]["waitlist_state"]
        }
        Insert: {
          actor_email: string
          actor_name: string
          claim_token?: string | null
          created_at?: string
          desired_window: string
          id?: string
          notified_at?: string | null
          offer_expires_at?: string | null
          offered_slot_id?: string | null
          status?: Database["public"]["Enums"]["waitlist_state"]
        }
        Update: {
          actor_email?: string
          actor_name?: string
          claim_token?: string | null
          created_at?: string
          desired_window?: string
          id?: string
          notified_at?: string | null
          offer_expires_at?: string | null
          offered_slot_id?: string | null
          status?: Database["public"]["Enums"]["waitlist_state"]
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_offered_slot_id_fkey"
            columns: ["offered_slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "owner"
      booking_state: "confirmed" | "cancelled" | "completed"
      deposit_state: "pending" | "paid" | "failed" | "refunded"
      slot_status: "open" | "held" | "booked" | "done"
      waitlist_state: "waiting" | "offered" | "claimed" | "expired"
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
      app_role: ["owner"],
      booking_state: ["confirmed", "cancelled", "completed"],
      deposit_state: ["pending", "paid", "failed", "refunded"],
      slot_status: ["open", "held", "booked", "done"],
      waitlist_state: ["waiting", "offered", "claimed", "expired"],
    },
  },
} as const
