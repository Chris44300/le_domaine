/**
 * Types TypeScript décrivant le schéma Supabase (voir supabase/schema.sql).
 *
 * Écrits à la main plutôt que générés, car il n'y a pas encore de projet
 * Supabase relié à ce dépôt. Une fois le projet créé, on peut les régénérer
 * avec `npx supabase gen types typescript` pour rester parfaitement
 * synchronisé — mais gardez ce fichier à jour vous-même si vous éditez le
 * schéma sans régénérer.
 *
 * `Relationships: []` sur chaque table est requis par le typage générique de
 * @supabase/postgrest-js (GenericTable) même si on ne décrit pas les clés
 * étrangères ici en détail — sans lui, TypeScript retombe silencieusement
 * sur `never` pour Row/Insert/Update.
 */

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["households"]["Insert"]>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          household_id: string;
          auth_user_id: string | null;
          email: string | null;
          display_name: string;
          is_active: boolean;
          created_at: string;
          /** Applications du Domaine visibles par cette personne. null = accès complet. */
          apps_autorises: string[] | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          auth_user_id?: string | null;
          email?: string | null;
          display_name: string;
          is_active?: boolean;
          created_at?: string;
          apps_autorises?: string[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          household_id: string;
          category_id: string | null;
          name: string;
          recurrence_days: number;
          assignee_member_id: string | null;
          is_active: boolean;
          notes: string | null;
          last_completed_on: string | null;
          snoozed_until: string | null;
          created_at: string;
          /** Jour de création (fuseau du foyer) — sert d'ancrage de repli si jamais faite. */
          created_on: string;
          updated_at: string;
          /** Colonne calculée côté base — ne jamais l'écrire directement. */
          next_due_date: string;
          /** Durée estimée en minutes, facultative. */
          estimated_minutes: number | null;
          /** Nombre de fois où la tâche a été reportée (compteur cumulé). */
          snooze_count: number;
        };
        Insert: {
          id?: string;
          household_id: string;
          category_id?: string | null;
          name: string;
          recurrence_days: number;
          assignee_member_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
          last_completed_on?: string | null;
          snoozed_until?: string | null;
          created_at?: string;
          created_on?: string;
          updated_at?: string;
          estimated_minutes?: number | null;
          snooze_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      completions: {
        Row: {
          id: string;
          household_id: string;
          task_id: string | null;
          task_name_snapshot: string;
          category_name_snapshot: string | null;
          assigned_to_name_snapshot: string | null;
          completed_by_name_snapshot: string | null;
          due_date: string | null;
          completed_on: string;
          assigned_to_member_id: string | null;
          completed_by_member_id: string | null;
          created_at: string;
          estimated_minutes_snapshot: number | null;
          /** État de tasks.last_completed_on juste avant cette complétion — sert à "Annuler". */
          previous_last_completed_on: string | null;
          previous_snoozed_until: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          task_id?: string | null;
          task_name_snapshot: string;
          category_name_snapshot?: string | null;
          assigned_to_name_snapshot?: string | null;
          completed_by_name_snapshot?: string | null;
          due_date?: string | null;
          completed_on: string;
          assigned_to_member_id?: string | null;
          completed_by_member_id?: string | null;
          created_at?: string;
          estimated_minutes_snapshot?: number | null;
          previous_last_completed_on?: string | null;
          previous_snoozed_until?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["completions"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          household_id: string;
          member_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          member_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      todos: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          assignee_member_id: string | null;
          created_by_member_id: string | null;
          is_done: boolean;
          completed_by_member_id: string | null;
          completed_on: string | null;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          assignee_member_id?: string | null;
          created_by_member_id?: string | null;
          is_done?: boolean;
          completed_by_member_id?: string | null;
          completed_on?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["todos"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_task: {
        Args: {
          p_task_id: string;
          p_completed_on: string;
          p_completed_by_member_id: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      snooze_task: {
        Args: {
          p_task_id: string;
          p_days?: number;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      move_task_to: {
        Args: {
          p_task_id: string;
          p_date: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      undo_last_completion: {
        Args: {
          p_task_id: string;
          p_today: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      reset_household_history: {
        Args: {
          p_household_id: string;
        };
        Returns: undefined;
      };
      update_completion_date: {
        Args: {
          p_completion_id: string;
          p_new_date: string;
          p_today: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
    };
  };
}
