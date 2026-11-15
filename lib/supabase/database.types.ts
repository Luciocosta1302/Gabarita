
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attempts": {
                  Row: {
                    "answer": string,"confidence": string | null,"correct": boolean,"created_at": string,"id": string,"question_id": string,"time_ms": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"confidence"?: string | null,"correct": boolean,"created_at"?: string,"id"?: string,"question_id": string,"time_ms"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "answer"?: string,"confidence"?: string | null,"correct"?: boolean,"created_at"?: string,"id"?: string,"question_id"?: string,"time_ms"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"chunks": {
                  Row: {
                    "content": string,"embedding": string | null,"id": string,"material_id": string,"page": number | null,"subject_id": string,"topic_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"embedding"?: string | null,"id"?: string,"material_id": string,"page"?: number | null,"subject_id": string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"embedding"?: string | null,"id"?: string,"material_id"?: string,"page"?: number | null,"subject_id"?: string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chunks_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chunks_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chunks_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"error_notebook": {
                  Row: {
                    "attempt_id": string,"created_at": string,"followup_question_id": string | null,"id": string,"user_id": string,"why_wrong": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_id": string,"created_at"?: string,"followup_question_id"?: string | null,"id"?: string,"user_id"?: string,"why_wrong"?: string | null
                  }
                  Update: {
                    "attempt_id"?: string,"created_at"?: string,"followup_question_id"?: string | null,"id"?: string,"user_id"?: string,"why_wrong"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "error_notebook_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "error_notebook_followup_question_id_fkey"
      columns: ["followup_question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"feynman_sessions": {
                  Row: {
                    "created_at": string,"feedback_json": Json | null,"id": string,"topic_id": string | null,"transcript": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback_json"?: Json | null,"id"?: string,"topic_id"?: string | null,"transcript": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"feedback_json"?: Json | null,"id"?: string,"topic_id"?: string | null,"transcript"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feynman_sessions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"flashcards": {
                  Row: {
                    "back": string,"chunk_id": string | null,"created_at": string,"front": string,"id": string,"subject_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "back": string,"chunk_id"?: string | null,"created_at"?: string,"front": string,"id"?: string,"subject_id": string,"user_id"?: string
                  }
                  Update: {
                    "back"?: string,"chunk_id"?: string | null,"created_at"?: string,"front"?: string,"id"?: string,"subject_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "flashcards_chunk_id_fkey"
      columns: ["chunk_id"]
isOneToOne: false
      referencedRelation: "chunks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "flashcards_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"error": string | null,"id": string,"kind": string,"payload_json": NonNullable<Json>,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"error"?: string | null,"id"?: string,"kind": string,"payload_json"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"error"?: string | null,"id"?: string,"kind"?: string,"payload_json"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"materials": {
                  Row: {
                    "created_at": string,"id": string,"page_count": number | null,"status": string,"storage_path": string | null,"subject_id": string,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"page_count"?: number | null,"status"?: string,"storage_path"?: string | null,"subject_id": string,"title": string,"type": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"page_count"?: number | null,"status"?: string,"storage_path"?: string | null,"subject_id"?: string,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_days": {
                  Row: {
                    "date": string,"done": boolean,"id": string,"plan_id": string,"tasks_json": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "date": string,"done"?: boolean,"id"?: string,"plan_id": string,"tasks_json"?: NonNullable<Json>,"user_id"?: string
                  }
                  Update: {
                    "date"?: string,"done"?: boolean,"id"?: string,"plan_id"?: string,"tasks_json"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_days_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "study_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"daily_quota_used": number,"id": string,"name": string | null,"plan": string,"whatsapp_phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"daily_quota_used"?: number,"id": string,"name"?: string | null,"plan"?: string,"whatsapp_phone"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"daily_quota_used"?: number,"id"?: string,"name"?: string | null,"plan"?: string,"whatsapp_phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "answer": string,"chunk_id": string | null,"created_at": string,"difficulty": string | null,"explanation": string | null,"id": string,"options_json": Json | null,"source_page": number | null,"stem": string,"style": string | null,"subject_id": string,"topic_id": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"chunk_id"?: string | null,"created_at"?: string,"difficulty"?: string | null,"explanation"?: string | null,"id"?: string,"options_json"?: Json | null,"source_page"?: number | null,"stem": string,"style"?: string | null,"subject_id": string,"topic_id"?: string | null,"type": string,"user_id"?: string
                  }
                  Update: {
                    "answer"?: string,"chunk_id"?: string | null,"created_at"?: string,"difficulty"?: string | null,"explanation"?: string | null,"id"?: string,"options_json"?: Json | null,"source_page"?: number | null,"stem"?: string,"style"?: string | null,"subject_id"?: string,"topic_id"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_chunk_id_fkey"
      columns: ["chunk_id"]
isOneToOne: false
      referencedRelation: "chunks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "due_at": string,"fsrs_state_json": NonNullable<Json>,"id": string,"item_id": string,"item_type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "due_at"?: string,"fsrs_state_json"?: NonNullable<Json>,"id"?: string,"item_id": string,"item_type": string,"user_id"?: string
                  }
                  Update: {
                    "due_at"?: string,"fsrs_state_json"?: NonNullable<Json>,"id"?: string,"item_id"?: string,"item_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"room_members": {
                  Row: {
                    "joined_at": string,"room_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"room_id": string,"user_id"?: string
                  }
                  Update: {
                    "joined_at"?: string,"room_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_members_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"id": string,"invite_code": string,"owner_id": string,"subject_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"owner_id"?: string,"subject_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"owner_id"?: string,"subject_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"study_plans": {
                  Row: {
                    "generated_at": string,"id": string,"subject_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "generated_at"?: string,"id"?: string,"subject_id": string,"user_id"?: string
                  }
                  Update: {
                    "generated_at"?: string,"id"?: string,"subject_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_plans_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "created_at": string,"exam_date": string | null,"exam_style": string,"hours_per_day": number | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exam_date"?: string | null,"exam_style"?: string,"hours_per_day"?: number | null,"id"?: string,"name": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"exam_date"?: string | null,"exam_style"?: string,"hours_per_day"?: number | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"teacher_profiles": {
                  Row: {
                    "created_at": string,"id": string,"likely_topics_json": NonNullable<Json>,"style_json": NonNullable<Json>,"subject_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"likely_topics_json"?: NonNullable<Json>,"style_json"?: NonNullable<Json>,"subject_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"likely_topics_json"?: NonNullable<Json>,"style_json"?: NonNullable<Json>,"subject_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_profiles_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "id": string,"name": string,"subject_id": string,"summary": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"subject_id": string,"summary"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"subject_id"?: string,"summary"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_room_member":
{ Args: { "p_room_id": string }; Returns: boolean
                           },
"match_chunks":
{ Args: { "k"?: number,"p_subject_id": string,"query_embedding": string }; Returns: {
              "content": string,"id": string,"material_id": string,"page": number,"similarity": number
            }[]
                           },
"owns_subject":
{ Args: { "p_subject_id": string }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
