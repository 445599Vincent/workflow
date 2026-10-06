export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          bucket: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          entity_id: string;
          entity_table: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          bucket?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          entity_id: string;
          entity_table: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          entity_id?: string;
          entity_table?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          changed_fields: string[] | null;
          entity_id: string | null;
          entity_table: string;
          id: number;
          new_data: Json | null;
          occurred_at: string;
          old_data: Json | null;
          summary: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          changed_fields?: string[] | null;
          entity_id?: string | null;
          entity_table: string;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          summary?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          changed_fields?: string[] | null;
          entity_id?: string | null;
          entity_table?: string;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          address: string | null;
          code: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          external_id: string | null;
          external_source: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          tax_id: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          code?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          code?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_sequences: {
        Row: {
          code: string;
          next_value: number;
          padding: number;
          prefix: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          next_value?: number;
          padding?: number;
          prefix: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          next_value?: number;
          padding?: number;
          prefix?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_adjustments: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_opening_balance: boolean;
          material_id: string;
          movement_id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          notes: string | null;
          number: string;
          quantity: number;
          reason: string;
          unit_cost: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_opening_balance?: boolean;
          material_id: string;
          movement_id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          notes?: string | null;
          number: string;
          quantity: number;
          reason: string;
          unit_cost: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_opening_balance?: boolean;
          material_id?: string;
          movement_id?: string;
          movement_type?: Database["public"]["Enums"]["movement_type"];
          notes?: string | null;
          number?: string;
          quantity?: number;
          reason?: string;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_adjustments_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_adjustments_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_adjustments_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "inventory_movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_adjustments_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "material_kardex";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          avg_cost_after: number;
          avg_cost_before: number;
          created_at: string;
          created_by: string | null;
          id: string;
          material_id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          negative_override: boolean;
          notes: string | null;
          occurred_at: string;
          on_hand_after: number;
          on_hand_before: number;
          on_hand_delta: number;
          quantity: number;
          reference: string | null;
          reserved_after: number;
          reserved_before: number;
          reserved_delta: number;
          seq: number;
          source_id: string | null;
          source_table: string | null;
          total_cost: number | null;
          unit_cost: number | null;
          work_order_id: string | null;
        };
        Insert: {
          avg_cost_after: number;
          avg_cost_before: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          negative_override?: boolean;
          notes?: string | null;
          occurred_at?: string;
          on_hand_after: number;
          on_hand_before: number;
          on_hand_delta: number;
          quantity: number;
          reference?: string | null;
          reserved_after: number;
          reserved_before: number;
          reserved_delta: number;
          seq?: never;
          source_id?: string | null;
          source_table?: string | null;
          total_cost?: number | null;
          unit_cost?: number | null;
          work_order_id?: string | null;
        };
        Update: {
          avg_cost_after?: number;
          avg_cost_before?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id?: string;
          movement_type?: Database["public"]["Enums"]["movement_type"];
          negative_override?: boolean;
          notes?: string | null;
          occurred_at?: string;
          on_hand_after?: number;
          on_hand_before?: number;
          on_hand_delta?: number;
          quantity?: number;
          reference?: string | null;
          reserved_after?: number;
          reserved_before?: number;
          reserved_delta?: number;
          seq?: never;
          source_id?: string | null;
          source_table?: string | null;
          total_cost?: number | null;
          unit_cost?: number | null;
          work_order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_receipt_lines: {
        Row: {
          base_quantity: number;
          conversion_factor: number;
          id: string;
          line_no: number;
          line_total: number;
          material_id: string;
          movement_id: string;
          notes: string | null;
          quantity: number;
          receipt_id: string;
          unit_cost: number;
          unit_id: string;
        };
        Insert: {
          base_quantity: number;
          conversion_factor?: number;
          id?: string;
          line_no: number;
          line_total: number;
          material_id: string;
          movement_id: string;
          notes?: string | null;
          quantity: number;
          receipt_id: string;
          unit_cost: number;
          unit_id: string;
        };
        Update: {
          base_quantity?: number;
          conversion_factor?: number;
          id?: string;
          line_no?: number;
          line_total?: number;
          material_id?: string;
          movement_id?: string;
          notes?: string | null;
          quantity?: number;
          receipt_id?: string;
          unit_cost?: number;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_receipt_lines_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipt_lines_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipt_lines_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "inventory_movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipt_lines_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "material_kardex";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipt_lines_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "inventory_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipt_lines_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_receipts: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_number: string | null;
          notes: string | null;
          number: string;
          receipt_date: string;
          supplier_id: string | null;
          total_cost: number;
          updated_at: string;
          updated_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_number?: string | null;
          notes?: string | null;
          number: string;
          receipt_date?: string;
          supplier_id?: string | null;
          total_cost?: number;
          updated_at?: string;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_number?: string | null;
          notes?: string | null;
          number?: string;
          receipt_date?: string;
          supplier_id?: string | null;
          total_cost?: number;
          updated_at?: string;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_receipts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_receipts_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      material_consumptions: {
        Row: {
          consumed_at: string;
          created_at: string;
          created_by: string | null;
          id: string;
          material_id: string;
          movement_id: string;
          notes: string | null;
          quantity: number;
          total_cost: number;
          unit_cost: number;
          updated_at: string;
          updated_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          work_order_id: string;
          work_order_material_id: string | null;
        };
        Insert: {
          consumed_at?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id: string;
          movement_id: string;
          notes?: string | null;
          quantity: number;
          total_cost: number;
          unit_cost: number;
          updated_at?: string;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          work_order_id: string;
          work_order_material_id?: string | null;
        };
        Update: {
          consumed_at?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id?: string;
          movement_id?: string;
          notes?: string | null;
          quantity?: number;
          total_cost?: number;
          unit_cost?: number;
          updated_at?: string;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          work_order_id?: string;
          work_order_material_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "material_consumptions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "inventory_movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "material_kardex";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_consumptions_work_order_material_id_fkey";
            columns: ["work_order_material_id"];
            isOneToOne: false;
            referencedRelation: "work_order_materials";
            referencedColumns: ["id"];
          },
        ];
      };
      material_reservations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          material_id: string;
          movement_id: string;
          notes: string | null;
          quantity: number;
          released_at: string | null;
          remaining_quantity: number;
          status: Database["public"]["Enums"]["reservation_status"];
          updated_at: string;
          updated_by: string | null;
          work_order_id: string;
          work_order_material_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id: string;
          movement_id: string;
          notes?: string | null;
          quantity: number;
          released_at?: string | null;
          remaining_quantity: number;
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string;
          updated_by?: string | null;
          work_order_id: string;
          work_order_material_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id?: string;
          movement_id?: string;
          notes?: string | null;
          quantity?: number;
          released_at?: string | null;
          remaining_quantity?: number;
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string;
          updated_by?: string | null;
          work_order_id?: string;
          work_order_material_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "material_reservations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "inventory_movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "material_kardex";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_reservations_work_order_material_id_fkey";
            columns: ["work_order_material_id"];
            isOneToOne: false;
            referencedRelation: "work_order_materials";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          avg_cost: number;
          base_unit_id: string;
          category_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          external_id: string | null;
          external_source: string | null;
          id: string;
          is_active: boolean;
          last_cost: number;
          location_id: string | null;
          max_stock: number | null;
          min_stock: number;
          name: string;
          primary_supplier_id: string | null;
          sku: string;
          stock_available: number | null;
          stock_on_hand: number;
          stock_reserved: number;
          tracks_remnants: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          avg_cost?: number;
          base_unit_id: string;
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          is_active?: boolean;
          last_cost?: number;
          location_id?: string | null;
          max_stock?: number | null;
          min_stock?: number;
          name: string;
          primary_supplier_id?: string | null;
          sku: string;
          stock_available?: never;
          stock_on_hand?: number;
          stock_reserved?: number;
          tracks_remnants?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          avg_cost?: number;
          base_unit_id?: string;
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          is_active?: boolean;
          last_cost?: number;
          location_id?: string | null;
          max_stock?: number | null;
          min_stock?: number;
          name?: string;
          primary_supplier_id?: string | null;
          sku?: string;
          stock_available?: never;
          stock_on_hand?: number;
          stock_reserved?: number;
          tracks_remnants?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "materials_base_unit_id_fkey";
            columns: ["base_unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_primary_supplier_id_fkey";
            columns: ["primary_supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          phone: string | null;
          role_code: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email: string;
          full_name?: string;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          role_code?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          role_code?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "profiles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      remnants: {
        Row: {
          area: number | null;
          code: string;
          created_at: string;
          created_by: string | null;
          id: string;
          length: number | null;
          location_id: string | null;
          material_id: string;
          notes: string | null;
          origin_work_order_id: string | null;
          quantity: number;
          status: Database["public"]["Enums"]["remnant_status"];
          updated_at: string;
          updated_by: string | null;
          used_in_work_order_id: string | null;
          width: number | null;
        };
        Insert: {
          area?: never;
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          length?: number | null;
          location_id?: string | null;
          material_id: string;
          notes?: string | null;
          origin_work_order_id?: string | null;
          quantity: number;
          status?: Database["public"]["Enums"]["remnant_status"];
          updated_at?: string;
          updated_by?: string | null;
          used_in_work_order_id?: string | null;
          width?: number | null;
        };
        Update: {
          area?: never;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          length?: number | null;
          location_id?: string | null;
          material_id?: string;
          notes?: string | null;
          origin_work_order_id?: string | null;
          quantity?: number;
          status?: Database["public"]["Enums"]["remnant_status"];
          updated_at?: string;
          updated_by?: string | null;
          used_in_work_order_id?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "remnants_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remnants_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remnants_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remnants_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remnants_origin_work_order_id_fkey";
            columns: ["origin_work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remnants_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remnants_used_in_work_order_id_fkey";
            columns: ["used_in_work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          permission: string;
          role_code: string;
        };
        Insert: {
          created_at?: string;
          permission: string;
          role_code: string;
        };
        Update: {
          created_at?: string;
          permission?: string;
          role_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["code"];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          description: string | null;
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          description?: string | null;
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          description?: string | null;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          address: string | null;
          code: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          external_id: string | null;
          external_source: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          tax_id: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          code?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          code?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suppliers_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      unit_conversions: {
        Row: {
          created_at: string;
          created_by: string | null;
          factor: number;
          from_unit_id: string;
          id: string;
          is_active: boolean;
          material_id: string | null;
          notes: string | null;
          to_unit_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          factor: number;
          from_unit_id: string;
          id?: string;
          is_active?: boolean;
          material_id?: string | null;
          notes?: string | null;
          to_unit_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          factor?: number;
          from_unit_id?: string;
          id?: string;
          is_active?: boolean;
          material_id?: string | null;
          notes?: string | null;
          to_unit_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "unit_conversions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_conversions_from_unit_id_fkey";
            columns: ["from_unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_conversions_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_conversions_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_conversions_to_unit_id_fkey";
            columns: ["to_unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_conversions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          decimals: number;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["unit_kind"];
          name: string;
          symbol: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          decimals?: number;
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["unit_kind"];
          name: string;
          symbol: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          decimals?: number;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["unit_kind"];
          name?: string;
          symbol?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "units_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      waste_records: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          material_id: string;
          movement_id: string;
          notes: string | null;
          occurred_at: string;
          quantity: number;
          reason: Database["public"]["Enums"]["waste_reason"];
          total_cost: number;
          unit_cost: number;
          updated_at: string;
          updated_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          work_order_id: string | null;
          work_order_material_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id: string;
          movement_id: string;
          notes?: string | null;
          occurred_at?: string;
          quantity: number;
          reason: Database["public"]["Enums"]["waste_reason"];
          total_cost: number;
          unit_cost: number;
          updated_at?: string;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          work_order_id?: string | null;
          work_order_material_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          material_id?: string;
          movement_id?: string;
          notes?: string | null;
          occurred_at?: string;
          quantity?: number;
          reason?: Database["public"]["Enums"]["waste_reason"];
          total_cost?: number;
          unit_cost?: number;
          updated_at?: string;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          work_order_id?: string | null;
          work_order_material_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "waste_records_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "inventory_movements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "material_kardex";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waste_records_work_order_material_id_fkey";
            columns: ["work_order_material_id"];
            isOneToOne: false;
            referencedRelation: "work_order_materials";
            referencedColumns: ["id"];
          },
        ];
      };
      work_order_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          event_type: string;
          from_status: Database["public"]["Enums"]["work_order_status"] | null;
          id: string;
          note: string | null;
          payload: Json | null;
          to_status: Database["public"]["Enums"]["work_order_status"] | null;
          work_order_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          event_type: string;
          from_status?: Database["public"]["Enums"]["work_order_status"] | null;
          id?: string;
          note?: string | null;
          payload?: Json | null;
          to_status?: Database["public"]["Enums"]["work_order_status"] | null;
          work_order_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          event_type?: string;
          from_status?: Database["public"]["Enums"]["work_order_status"] | null;
          id?: string;
          note?: string | null;
          payload?: Json | null;
          to_status?: Database["public"]["Enums"]["work_order_status"] | null;
          work_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_order_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_events_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      work_order_materials: {
        Row: {
          consumed_quantity: number;
          created_at: string;
          created_by: string | null;
          estimated_total_cost: number | null;
          estimated_unit_cost: number;
          id: string;
          material_id: string;
          notes: string | null;
          planned_quantity: number;
          reserved_quantity: number;
          updated_at: string;
          updated_by: string | null;
          waste_quantity: number;
          work_order_id: string;
        };
        Insert: {
          consumed_quantity?: number;
          created_at?: string;
          created_by?: string | null;
          estimated_total_cost?: never;
          estimated_unit_cost?: number;
          id?: string;
          material_id: string;
          notes?: string | null;
          planned_quantity: number;
          reserved_quantity?: number;
          updated_at?: string;
          updated_by?: string | null;
          waste_quantity?: number;
          work_order_id: string;
        };
        Update: {
          consumed_quantity?: number;
          created_at?: string;
          created_by?: string | null;
          estimated_total_cost?: never;
          estimated_unit_cost?: number;
          id?: string;
          material_id?: string;
          notes?: string | null;
          planned_quantity?: number;
          reserved_quantity?: number;
          updated_at?: string;
          updated_by?: string | null;
          waste_quantity?: number;
          work_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_order_materials_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_materials_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_materials_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_materials_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_materials_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          actual_material_cost: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          description: string | null;
          due_date: string | null;
          estimated_material_cost: number;
          external_id: string | null;
          external_source: string | null;
          id: string;
          number: string;
          priority: Database["public"]["Enums"]["work_order_priority"];
          responsible_id: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["work_order_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          actual_material_cost?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          estimated_material_cost?: number;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          number: string;
          priority?: Database["public"]["Enums"]["work_order_priority"];
          responsible_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["work_order_status"];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          actual_material_cost?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          description?: string | null;
          due_date?: string | null;
          estimated_material_cost?: number;
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          number?: string;
          priority?: Database["public"]["Enums"]["work_order_priority"];
          responsible_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["work_order_status"];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_responsible_id_fkey";
            columns: ["responsible_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      material_kardex: {
        Row: {
          avg_cost_after: number | null;
          created_by: string | null;
          created_by_name: string | null;
          id: string | null;
          material_id: string | null;
          movement_type: Database["public"]["Enums"]["movement_type"] | null;
          negative_override: boolean | null;
          notes: string | null;
          occurred_at: string | null;
          on_hand_after: number | null;
          on_hand_before: number | null;
          on_hand_delta: number | null;
          quantity: number | null;
          reference: string | null;
          reserved_after: number | null;
          reserved_before: number | null;
          reserved_delta: number | null;
          seq: number | null;
          source_id: string | null;
          source_table: string | null;
          total_cost: number | null;
          unit_cost: number | null;
          work_order_id: string | null;
          work_order_number: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      materials_overview: {
        Row: {
          avg_cost: number | null;
          base_unit_id: string | null;
          category_id: string | null;
          category_name: string | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          inventory_value: number | null;
          is_active: boolean | null;
          last_cost: number | null;
          location_id: string | null;
          location_name: string | null;
          max_stock: number | null;
          min_stock: number | null;
          name: string | null;
          primary_supplier_id: string | null;
          sku: string | null;
          stock_available: number | null;
          stock_on_hand: number | null;
          stock_reserved: number | null;
          stock_status: string | null;
          supplier_name: string | null;
          tracks_remnants: boolean | null;
          unit_code: string | null;
          unit_decimals: number | null;
          unit_name: string | null;
          unit_symbol: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "materials_base_unit_id_fkey";
            columns: ["base_unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_primary_supplier_id_fkey";
            columns: ["primary_supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      apply_stock_movement: {
        Args: {
          p_allow_negative?: boolean;
          p_material_id: string;
          p_movement_type: Database["public"]["Enums"]["movement_type"];
          p_notes?: string;
          p_occurred_at?: string;
          p_quantity: number;
          p_reference?: string;
          p_reserved_consumed?: number;
          p_source_id?: string;
          p_source_table?: string;
          p_unit_cost?: number;
          p_work_order_id?: string;
        };
        Returns: {
          avg_cost_after: number;
          avg_cost_before: number;
          created_at: string;
          created_by: string | null;
          id: string;
          material_id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          negative_override: boolean;
          notes: string | null;
          occurred_at: string;
          on_hand_after: number;
          on_hand_before: number;
          on_hand_delta: number;
          quantity: number;
          reference: string | null;
          reserved_after: number;
          reserved_before: number;
          reserved_delta: number;
          seq: number;
          source_id: string | null;
          source_table: string | null;
          total_cost: number | null;
          unit_cost: number | null;
          work_order_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "inventory_movements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_inventory_adjustment: {
        Args: {
          p_allow_negative?: boolean;
          p_material_id: string;
          p_movement_type: Database["public"]["Enums"]["movement_type"];
          p_notes?: string;
          p_quantity: number;
          p_reason: string;
          p_unit_cost?: number;
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_opening_balance: boolean;
          material_id: string;
          movement_id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          notes: string | null;
          number: string;
          quantity: number;
          reason: string;
          unit_cost: number;
        };
        SetofOptions: {
          from: "*";
          to: "inventory_adjustments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_material: {
        Args: {
          p_base_unit_id: string;
          p_category_id: string;
          p_description?: string;
          p_location_id?: string;
          p_max_stock?: number;
          p_min_stock?: number;
          p_name: string;
          p_opening_quantity?: number;
          p_opening_unit_cost?: number;
          p_primary_supplier_id?: string;
          p_sku?: string;
          p_tracks_remnants?: boolean;
        };
        Returns: {
          avg_cost: number;
          base_unit_id: string;
          category_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          external_id: string | null;
          external_source: string | null;
          id: string;
          is_active: boolean;
          last_cost: number;
          location_id: string | null;
          max_stock: number | null;
          min_stock: number;
          name: string;
          primary_supplier_id: string | null;
          sku: string;
          stock_available: number | null;
          stock_on_hand: number;
          stock_reserved: number;
          tracks_remnants: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "materials";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_user_permissions: { Args: Record<PropertyKey, never>; Returns: string[] };
      get_dashboard_summary: { Args: Record<PropertyKey, never>; Returns: Json };
      get_top_consumed_materials: {
        Args: { p_from?: string; p_limit?: number };
        Returns: {
          material_id: string;
          name: string;
          quantity: number;
          sku: string;
          total_cost: number;
          unit_decimals: number;
          unit_symbol: string;
        }[];
      };
      has_permission: { Args: { p_permission: string }; Returns: boolean };
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      log_audit_event: {
        Args: {
          p_action: string;
          p_data?: Json;
          p_entity_id: string;
          p_entity_table: string;
          p_summary: string;
        };
        Returns: undefined;
      };
      next_document_number: { Args: { p_code: string }; Returns: string };
      post_inventory_receipt: {
        Args: {
          p_invoice_number?: string;
          p_lines: Json;
          p_notes?: string;
          p_receipt_date?: string;
          p_supplier_id?: string;
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_number: string | null;
          notes: string | null;
          number: string;
          receipt_date: string;
          supplier_id: string | null;
          total_cost: number;
          updated_at: string;
          updated_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "inventory_receipts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      require_permission: { Args: { p_permission: string }; Returns: undefined };
      void_inventory_receipt: {
        Args: { p_reason: string; p_receipt_id: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_number: string | null;
          notes: string | null;
          number: string;
          receipt_date: string;
          supplier_id: string | null;
          total_cost: number;
          updated_at: string;
          updated_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "inventory_receipts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      movement_type:
        | "entry"
        | "exit"
        | "reservation"
        | "reservation_release"
        | "consumption"
        | "waste"
        | "return"
        | "adjustment_in"
        | "adjustment_out";
      remnant_status: "available" | "reserved" | "used" | "discarded";
      reservation_status: "active" | "released" | "consumed";
      unit_kind: "count" | "length" | "area" | "volume" | "mass" | "package";
      waste_reason:
        "print_error" | "cutting" | "damage" | "test" | "installation" | "defect" | "other";
      work_order_priority: "low" | "normal" | "high" | "urgent";
      work_order_status:
        | "draft"
        | "pending"
        | "planned"
        | "in_production"
        | "in_installation"
        | "completed"
        | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      movement_type: [
        "entry",
        "exit",
        "reservation",
        "reservation_release",
        "consumption",
        "waste",
        "return",
        "adjustment_in",
        "adjustment_out",
      ],
      remnant_status: ["available", "reserved", "used", "discarded"],
      reservation_status: ["active", "released", "consumed"],
      unit_kind: ["count", "length", "area", "volume", "mass", "package"],
      waste_reason: ["print_error", "cutting", "damage", "test", "installation", "defect", "other"],
      work_order_priority: ["low", "normal", "high", "urgent"],
      work_order_status: [
        "draft",
        "pending",
        "planned",
        "in_production",
        "in_installation",
        "completed",
        "cancelled",
      ],
    },
  },
} as const;
