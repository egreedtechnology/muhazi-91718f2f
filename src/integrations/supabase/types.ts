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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          link_url: string | null
          message: string
          starts_at: string
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message: string
          starts_at?: string
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message?: string
          starts_at?: string
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          patient_account_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          request_type: string
          requested_date: string | null
          requested_time: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          patient_account_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          request_type: string
          requested_date?: string | null
          requested_time?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          patient_account_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          request_type?: string
          requested_date?: string | null
          requested_time?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_patient_account_id_fkey"
            columns: ["patient_account_id"]
            isOneToOne: false
            referencedRelation: "patient_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          service_id: string | null
          staff_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          service_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          service_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "public_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_records: {
        Row: {
          archived_at: string
          archived_by: string | null
          checksum: string | null
          created_at: string
          id: string
          label: string
          legal_hold: boolean
          legal_hold_reason: string | null
          patient_ref: string | null
          purged_at: string | null
          purged_by: string | null
          reason: string | null
          restored_at: string | null
          restored_by: string | null
          retention_until: string | null
          snapshot: Json
          source_id: string
          source_table: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          checksum?: string | null
          created_at?: string
          id?: string
          label: string
          legal_hold?: boolean
          legal_hold_reason?: string | null
          patient_ref?: string | null
          purged_at?: string | null
          purged_by?: string | null
          reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          retention_until?: string | null
          snapshot: Json
          source_id: string
          source_table: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          checksum?: string | null
          created_at?: string
          id?: string
          label?: string
          legal_hold?: boolean
          legal_hold_reason?: string | null
          patient_ref?: string | null
          purged_at?: string | null
          purged_by?: string | null
          reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          retention_until?: string | null
          snapshot?: Json
          source_id?: string
          source_table?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      backup_runs: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          notes: string | null
          record_count: number
          scope: string
          size_bytes: number
          status: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          record_count?: number
          scope: string
          size_bytes?: number
          status?: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          record_count?: number
          scope?: string
          size_bytes?: number
          status?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string
          content: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          faqs: Json
          focus_keyword: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          medical_reviewer: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          published_at: string | null
          reading_minutes: number | null
          scheduled_at: string | null
          slug: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string
          content: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          faqs?: Json
          focus_keyword?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          medical_reviewer?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          scheduled_at?: string | null
          slug: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          faqs?: Json
          focus_keyword?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          medical_reviewer?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          scheduled_at?: string | null
          slug?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      blog_revisions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          note: string | null
          post_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          note?: string | null
          post_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          note?: string | null
          post_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      gallery_media: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          is_hero_slide: boolean
          media_type: string
          media_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_hero_slide?: boolean
          media_type?: string
          media_url: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_hero_slide?: boolean
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      intake_forms: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          form_data: Json
          form_type: string
          id: string
          patient_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          patient_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          patient_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          service_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          service_id?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string | null
          discount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          patient_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          patient_id: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          patient_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_read: boolean
          message: string
          phone: string
          read_at: string | null
          read_by: string | null
          subject: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_read?: boolean
          message: string
          phone: string
          read_at?: string | null
          read_by?: string | null
          subject: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_read?: boolean
          message?: string
          phone?: string
          read_at?: string | null
          read_by?: string | null
          subject?: string
        }
        Relationships: []
      }
      patient_accounts: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          patient_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          patient_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          patient_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_accounts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_messages: {
        Row: {
          appointment_id: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          patient_account_id: string
          read_at: string | null
          sender_role: string
          sender_user_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          patient_account_id: string
          read_at?: string | null
          sender_role?: string
          sender_user_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          patient_account_id?: string
          read_at?: string | null
          sender_role?: string
          sender_user_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_patient_account_id_fkey"
            columns: ["patient_account_id"]
            isOneToOne: false
            referencedRelation: "patient_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notification_preferences: {
        Row: {
          appointment_reminders: boolean
          appointment_updates: boolean
          created_at: string
          email_enabled: boolean
          id: string
          patient_account_id: string
          reminder_hours_before: number
          sms_enabled: boolean
          treatment_updates: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          appointment_reminders?: boolean
          appointment_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          patient_account_id: string
          reminder_hours_before?: number
          sms_enabled?: boolean
          treatment_updates?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          appointment_reminders?: boolean
          appointment_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          patient_account_id?: string
          reminder_hours_before?: number
          sms_enabled?: boolean
          treatment_updates?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "patient_notification_preferences_patient_account_id_fkey"
            columns: ["patient_account_id"]
            isOneToOne: true
            referencedRelation: "patient_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          medical_notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          medical_notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          medical_notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          legal_basis: string | null
          minor_until_age: number | null
          record_type: string
          retention_years: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          legal_basis?: string | null
          minor_until_age?: number | null
          record_type: string
          retention_years?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          legal_basis?: string | null
          minor_until_age?: number | null
          record_type?: string
          retention_years?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          position: string | null
          specialization: string | null
          status: string
          updated_at: string
          user_id: string | null
          working_days: string[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          position?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          position?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
      treatment_records: {
        Row: {
          appointment_id: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          diagnosis: string | null
          follow_up_date: string | null
          id: string
          medications_prescribed: string[] | null
          patient_id: string
          procedures_performed: string[] | null
          treated_by: string | null
          treatment_date: string
          treatment_notes: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          medications_prescribed?: string[] | null
          patient_id: string
          procedures_performed?: string[] | null
          treated_by?: string | null
          treatment_date?: string
          treatment_notes?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          medications_prescribed?: string[] | null
          patient_id?: string
          procedures_performed?: string[] | null
          treated_by?: string | null
          treatment_date?: string
          treatment_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_treated_by_fkey"
            columns: ["treated_by"]
            isOneToOne: false
            referencedRelation: "public_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_records_treated_by_fkey"
            columns: ["treated_by"]
            isOneToOne: false
            referencedRelation: "staff"
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
      public_staff: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          specialization: string | null
          working_days: string[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          specialization?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          specialization?: string | null
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: { Args: { _slug: string }; Returns: undefined }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "receptionist"
        | "dentist"
        | "accountant"
        | "manager"
        | "dental_assistant"
        | "it_admin"
        | "cashier"
        | "lab_technician"
        | "pharmacist"
        | "nurse"
        | "cleaner"
        | "security_guard"
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
      app_role: [
        "super_admin",
        "receptionist",
        "dentist",
        "accountant",
        "manager",
        "dental_assistant",
        "it_admin",
        "cashier",
        "lab_technician",
        "pharmacist",
        "nurse",
        "cleaner",
        "security_guard",
      ],
    },
  },
} as const
