export type MerchantServiceRow = {
 id:string; organization_id:string; destination_id:string; venue_id:string|null; reference_venue_id:string|null; seller_source:'merchant'|'citypass'; name:string; stamp_name:string; amount:string; published:boolean; created_at:string;
};
export type ServiceAcquisitionRow = {
 id:string; user_id:string; service_id:string; request_id:string; destination_id:string; service_name:string; stamp_name:string; acquired_at:string;
};
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      merchant_services: { Row: MerchantServiceRow; Insert: MerchantServiceRow; Update: Partial<MerchantServiceRow>; Relationships: [] }
      merchant_service_acquisitions: { Row: ServiceAcquisitionRow; Insert: ServiceAcquisitionRow; Update: Partial<ServiceAcquisitionRow>; Relationships: [] }

      exploration_claims: {
        Row: { id: string; user_id: string; destination_id: string; guide_slug: string; item_id: string; claimed_at: string }
        Insert: { id?: string; user_id: string; destination_id: string; guide_slug: string; item_id: string; claimed_at?: string }
        Update: { id?: string; user_id?: string; destination_id?: string; guide_slug?: string; item_id?: string; claimed_at?: string }
        Relationships: []
      }

      checkout_requests: {
        Row: {
          merchant_service_id: string | null
          amount: string
          asset_code: string
          asset_issuer: string
          confirmed_at: string | null
          created_at: string
          destination_id: string
          expires_at: string
          id: string
          idempotency_key: string
          merchant_name: string
          network: string
          nonce: string
          organization_id: string
          payer_address: string | null
          payer_user_id: string | null
          payout_address: string
          payout_verified_by: string | null
          payout_source: string
          product: string
          status: string
          transaction_hash: string | null
        }
        Insert: {
          amount: string
          asset_code?: string
          asset_issuer?: string
          confirmed_at?: string | null
          created_at?: string
          destination_id: string
          expires_at?: string
          id?: string
          idempotency_key: string
          merchant_name: string
          network?: string
          nonce?: string
          organization_id: string
          payer_address?: string | null
          payer_user_id?: string | null
          payout_address: string
          payout_verified_by: string | null
          payout_source?: string
          product: string
          status?: string
          transaction_hash?: string | null
        }
        Update: {
          amount?: string
          asset_code?: string
          asset_issuer?: string
          confirmed_at?: string | null
          created_at?: string
          destination_id?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          merchant_name?: string
          network?: string
          nonce?: string
          organization_id?: string
          payer_address?: string | null
          payer_user_id?: string | null
          payout_address?: string
          payout_verified_by?: string | null
          payout_source?: string
          product?: string
          status?: string
          transaction_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_requests_organization_id_destination_id_fkey"
            columns: ["organization_id", "destination_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "destination_id"]
          },
          {
            foreignKeyName: "checkout_requests_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_requests_payout_verified_by_fkey"
            columns: ["payout_verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          currency_code: string
          names: Json
        }
        Insert: {
          code: string
          currency_code: string
          names: Json
        }
        Update: {
          code?: string
          currency_code?: string
          names?: Json
        }
        Relationships: []
      }
      destinations: {
        Row: {
          country_code: string
          id: string
          name: string
          names: Json
          slug: string
          timezone: string
        }
        Insert: {
          country_code?: string
          id?: string
          name: string
          names: Json
          slug: string
          timezone?: string
        }
        Update: {
          country_code?: string
          id?: string
          name?: string
          names?: Json
          slug?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_country_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      experiences: {
        Row: {
          booking_url: string | null
          created_at: string
          demo_key: string | null
          descriptions: Json
          destination_id: string
          id: string
          is_demo: boolean
          status: string
          titles: Json
          updated_at: string
          version: number
        }
        Insert: {
          booking_url?: string | null
          created_at?: string
          demo_key?: string | null
          descriptions: Json
          destination_id: string
          id?: string
          is_demo?: boolean
          status?: string
          titles: Json
          updated_at?: string
          version?: number
        }
        Update: {
          booking_url?: string | null
          created_at?: string
          demo_key?: string | null
          descriptions?: Json
          destination_id?: string
          id?: string
          is_demo?: boolean
          status?: string
          titles?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "experiences_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_reservations: {
        Row: {
          arrival: string
          created_at: string
          departure: string
          guest_count: number
          guest_email: string
          id: string
          organization_id: string
          reference: string
          status: string
        }
        Insert: {
          arrival: string
          created_at?: string
          departure: string
          guest_count: number
          guest_email: string
          id?: string
          organization_id: string
          reference: string
          status?: string
        }
        Update: {
          arrival?: string
          created_at?: string
          departure?: string
          guest_count?: number
          guest_email?: string
          id?: string
          organization_id?: string
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payouts: {
        Row: {
          address: string
          network: string
          organization_id: string
          verified_at: string
          verified_by: string
        }
        Insert: {
          address: string
          network: string
          organization_id: string
          verified_at?: string
          verified_by: string
        }
        Update: {
          address?: string
          network?: string
          organization_id?: string
          verified_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_payouts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approval_version: number
          created_at: string
          destination_id: string
          id: string
          kind: string
          name: string
          status: string
        }
        Insert: {
          approval_version?: number
          created_at?: string
          destination_id: string
          id?: string
          kind: string
          name: string
          status?: string
        }
        Update: {
          approval_version?: number
          created_at?: string
          destination_id?: string
          id?: string
          kind?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_profiles: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_global_traveler_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "traveler_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "passport_profiles_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          closed_at: string
          created_at: string
          ledger: number
          network: string
          request_id: string
          transaction_hash: string
        }
        Insert: {
          closed_at: string
          created_at?: string
          ledger: number
          network: string
          request_id: string
          transaction_hash: string
        }
        Update: {
          closed_at?: string
          created_at?: string
          ledger?: number
          network?: string
          request_id?: string
          transaction_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "checkout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          delta: number
          expires_at: string | null
          funding_organization_id: string
          id: string
          kind: string
          passport_id: string
          transaction_reference: string
        }
        Insert: {
          created_at?: string
          delta: number
          expires_at?: string | null
          funding_organization_id: string
          id?: string
          kind: string
          passport_id: string
          transaction_reference: string
        }
        Update: {
          created_at?: string
          delta?: number
          expires_at?: string | null
          funding_organization_id?: string
          id?: string
          kind?: string
          passport_id?: string
          transaction_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_funding_organization_id_fkey"
            columns: ["funding_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_passport_id_fkey"
            columns: ["passport_id"]
            isOneToOne: false
            referencedRelation: "passport_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      precheckin_submissions: {
        Row: {
          arrival_time: string
          email: string
          full_name: string
          id: string
          nationality: string
          operational_consent_at: string
          organization_id: string
          phone: string
          requests: string
          reservation_id: string
          residence: string
          retention_until: string
          submitted_at: string
        }
        Insert: {
          arrival_time: string
          email: string
          full_name: string
          id?: string
          nationality: string
          operational_consent_at?: string
          organization_id: string
          phone: string
          requests?: string
          reservation_id: string
          residence: string
          retention_until: string
          submitted_at?: string
        }
        Update: {
          arrival_time?: string
          email?: string
          full_name?: string
          id?: string
          nationality?: string
          operational_consent_at?: string
          organization_id?: string
          phone?: string
          requests?: string
          reservation_id?: string
          residence?: string
          retention_until?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precheckin_submissions_reservation_id_organization_id_fkey"
            columns: ["reservation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "hotel_reservations"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      route_stops: {
        Row: {
          destination_id: string
          position: number
          route_id: string
          venue_id: string
        }
        Insert: {
          destination_id: string
          position: number
          route_id: string
          venue_id: string
        }
        Update: {
          destination_id?: string
          position?: number
          route_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_destination_id_fkey"
            columns: ["route_id", "destination_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id", "destination_id"]
          },
          {
            foreignKeyName: "route_stops_venue_id_destination_id_fkey"
            columns: ["venue_id", "destination_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id", "destination_id"]
          },
        ]
      }
      routes: {
        Row: {
          description: Json
          destination_id: string
          id: string
          name: Json
          published: boolean
          required_stops: number
        }
        Insert: {
          description?: Json
          destination_id: string
          id?: string
          name: Json
          published?: boolean
          required_stops: number
        }
        Update: {
          description?: Json
          destination_id?: string
          id?: string
          name?: Json
          published?: boolean
          required_stops?: number
        }
        Relationships: [
          {
            foreignKeyName: "routes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      stamp_claims: {
        Row: {
          claimed_at: string
          credential_id: string
          destination_id: string
          id: string
          passport_id: string
          stamp_id: string
          verification_method: string
        }
        Insert: {
          claimed_at?: string
          credential_id: string
          destination_id: string
          id?: string
          passport_id: string
          stamp_id: string
          verification_method?: string
        }
        Update: {
          claimed_at?: string
          credential_id?: string
          destination_id?: string
          id?: string
          passport_id?: string
          stamp_id?: string
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamp_claims_passport_id_destination_id_fkey"
            columns: ["passport_id", "destination_id"]
            isOneToOne: false
            referencedRelation: "passport_profiles"
            referencedColumns: ["id", "destination_id"]
          },
          {
            foreignKeyName: "stamp_claims_stamp_id_destination_id_fkey"
            columns: ["stamp_id", "destination_id"]
            isOneToOne: false
            referencedRelation: "stamp_definitions"
            referencedColumns: ["id", "destination_id"]
          },
        ]
      }
      stamp_definitions: {
        Row: {
          active: boolean
          category: string
          destination_id: string
          id: string
          name: string
          tier: string
          venue_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          destination_id: string
          id?: string
          name: string
          tier?: string
          venue_id: string
        }
        Update: {
          active?: boolean
          category?: string
          destination_id?: string
          id?: string
          name?: string
          tier?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamp_definitions_venue_id_destination_id_fkey"
            columns: ["venue_id", "destination_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id", "destination_id"]
          },
        ]
      }
      traveler_profiles: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traveler_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          network: string | null
          pollar_application: string | null
          pollar_subject: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          network?: string | null
          pollar_application?: string | null
          pollar_subject?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          network?: string | null
          pollar_application?: string | null
          pollar_subject?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          catalog_key: string | null
          category: string
          checked_at: string | null
          description: Json
          destination_id: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          participation_status: string
          phone: string | null
          source_url: string | null
        }
        Insert: {
          address?: string | null
          catalog_key?: string | null
          category: string
          checked_at?: string | null
          description?: Json
          destination_id: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          participation_status?: string
          phone?: string | null
          source_url?: string | null
        }
        Update: {
          address?: string | null
          catalog_key?: string | null
          category?: string
          checked_at?: string | null
          description?: Json
          destination_id?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          participation_status?: string
          phone?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      merchant_service_command: { Args: {action:string;payload:Json}; Returns: Json }

      claim_exploration: { Args: { guide_slug: string; item_id: string }; Returns: Json }

      x402_order_command: { Args: { action: string; payload: Json }; Returns: Json }
      x402_delivery: { Args: { payload: string; mac: string }; Returns: Json }

      merchant_checkin_command: { Args: { payload: Json }; Returns: Json }
      activity_worker_command: { Args: { payload: string; mac: string }; Returns: Json }
      passport_activity_status: { Args: { contract_id: string }; Returns: Json }
      destination_pass_command: { Args: { action: string; payload: Json }; Returns: Json }

      checkout_command: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      create_pollar_session: {
        Args: { mac: string; payload: string }
        Returns: Json
      }
      end_app_session: { Args: never; Returns: undefined }
      experience_command: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      inquiry_command: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      merchant_review_command: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      passport_command: {
        Args: { action: string; payload: Json }
        Returns: Json
      }
      record_checkout_evidence: {
        Args: { mac: string; payload: string }
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
    Enums: {},
  },
} as const
