
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
            "achievements_seen": {
                  Row: {
                    "badge_id": string,"seen_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge_id": string,"seen_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "badge_id"?: string,"seen_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_usage": {
                  Row: {
                    "calls": number,"day": string,"input_tokens": number,"output_tokens": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calls"?: number,"day": string,"input_tokens"?: number,"output_tokens"?: number,"user_id": string
                  }
                  Update: {
                    "calls"?: number,"day"?: string,"input_tokens"?: number,"output_tokens"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"attempts": {
                  Row: {
                    "answer": string,"confidence": string | null,"correct": boolean,"created_at": string,"feedback_json": Json | null,"id": string,"question_id": string,"quiz_id": string | null,"score": number | null,"time_ms": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"confidence"?: string | null,"correct": boolean,"created_at"?: string,"feedback_json"?: Json | null,"id"?: string,"question_id": string,"quiz_id"?: string | null,"score"?: number | null,"time_ms"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "answer"?: string,"confidence"?: string | null,"correct"?: boolean,"created_at"?: string,"feedback_json"?: Json | null,"id"?: string,"question_id"?: string,"quiz_id"?: string | null,"score"?: number | null,"time_ms"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempts_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_messages": {
                  Row: {
                    "citations_json": NonNullable<Json>,"content": string,"created_at": string,"has_basis": boolean,"id": string,"material_id": string | null,"role": string,"subject_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "citations_json"?: NonNullable<Json>,"content": string,"created_at"?: string,"has_basis"?: boolean,"id"?: string,"material_id"?: string | null,"role": string,"subject_id": string,"user_id"?: string
                  }
                  Update: {
                    "citations_json"?: NonNullable<Json>,"content"?: string,"created_at"?: string,"has_basis"?: boolean,"id"?: string,"material_id"?: string | null,"role"?: string,"subject_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_messages_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_messages_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"chunks": {
                  Row: {
                    "chunk_index": number,"content": string,"embedding": string | null,"id": string,"material_id": string,"page": number | null,"subject_id": string,"topic_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chunk_index"?: number,"content": string,"embedding"?: string | null,"id"?: string,"material_id": string,"page"?: number | null,"subject_id": string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "chunk_index"?: number,"content"?: string,"embedding"?: string | null,"id"?: string,"material_id"?: string,"page"?: number | null,"subject_id"?: string,"topic_id"?: string | null,"user_id"?: string
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
                },"community_comments": {
                  Row: {
                    "author_name": string,"body": string,"created_at": string,"hidden": boolean,"id": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"body": string,"created_at"?: string,"hidden"?: boolean,"id"?: string,"post_id": string,"user_id"?: string
                  }
                  Update: {
                    "author_name"?: string,"body"?: string,"created_at"?: string,"hidden"?: boolean,"id"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"community_likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"community_posts": {
                  Row: {
                    "author_name": string,"body": string,"category": string,"created_at": string,"hidden": boolean,"id": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"body": string,"category": string,"created_at"?: string,"hidden"?: boolean,"id"?: string,"title": string,"user_id"?: string
                  }
                  Update: {
                    "author_name"?: string,"body"?: string,"category"?: string,"created_at"?: string,"hidden"?: boolean,"id"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"community_reports": {
                  Row: {
                    "comment_id": string | null,"created_at": string,"id": string,"post_id": string | null,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id"?: string | null,"created_at"?: string,"id"?: string,"post_id"?: string | null,"reason": string,"user_id"?: string
                  }
                  Update: {
                    "comment_id"?: string | null,"created_at"?: string,"id"?: string,"post_id"?: string | null,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_reports_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "community_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_reports_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "community_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"embedding_cache": {
                  Row: {
                    "created_at": string,"embedding": string,"key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"embedding": string,"key": string
                  }
                  Update: {
                    "created_at"?: string,"embedding"?: string,"key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"error_notebook": {
                  Row: {
                    "attempt_id": string,"created_at": string,"followup_question_id": string | null,"followup_status": string,"id": string,"resolved_at": string | null,"user_id": string,"why_wrong": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_id": string,"created_at"?: string,"followup_question_id"?: string | null,"followup_status"?: string,"id"?: string,"resolved_at"?: string | null,"user_id"?: string,"why_wrong"?: string | null
                  }
                  Update: {
                    "attempt_id"?: string,"created_at"?: string,"followup_question_id"?: string | null,"followup_status"?: string,"id"?: string,"resolved_at"?: string | null,"user_id"?: string,"why_wrong"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "error_notebook_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: true
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
                    "created_at": string,"feedback_json": Json | null,"id": string,"mode": string,"score": number | null,"subject_id": string | null,"topic_id": string | null,"transcript": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback_json"?: Json | null,"id"?: string,"mode"?: string,"score"?: number | null,"subject_id"?: string | null,"topic_id"?: string | null,"transcript": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"feedback_json"?: Json | null,"id"?: string,"mode"?: string,"score"?: number | null,"subject_id"?: string | null,"topic_id"?: string | null,"transcript"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feynman_sessions_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
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
                },"journal_entries": {
                  Row: {
                    "created_at": string,"difficulties": string | null,"focus_minutes": number | null,"id": string,"learned": string,"mood": string,"subject_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"difficulties"?: string | null,"focus_minutes"?: number | null,"id"?: string,"learned": string,"mood": string,"subject_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"difficulties"?: string | null,"focus_minutes"?: number | null,"id"?: string,"learned"?: string,"mood"?: string,"subject_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "journal_entries_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"journal_reflections": {
                  Row: {
                    "content_json": NonNullable<Json>,"created_at": string,"id": string,"period_end": string,"period_start": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_json": NonNullable<Json>,"created_at"?: string,"id"?: string,"period_end": string,"period_start": string,"user_id"?: string
                  }
                  Update: {
                    "content_json"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"period_end"?: string,"period_start"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"learning_paths": {
                  Row: {
                    "created_at": string,"goal": string,"id": string,"subject_id": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"goal": string,"id"?: string,"subject_id": string,"title": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"goal"?: string,"id"?: string,"subject_id"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_paths_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "created_at": string,"error": string | null,"extracted_text": string | null,"id": string,"page_count": number | null,"status": string,"storage_path": string | null,"subject_id": string,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"extracted_text"?: string | null,"id"?: string,"page_count"?: number | null,"status"?: string,"storage_path"?: string | null,"subject_id": string,"title": string,"type": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"extracted_text"?: string | null,"id"?: string,"page_count"?: number | null,"status"?: string,"storage_path"?: string | null,"subject_id"?: string,"title"?: string,"type"?: string,"user_id"?: string
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
                },"notes": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"subject_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string,"created_at"?: string,"id"?: string,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"path_steps": {
                  Row: {
                    "attempts_count": number,"completed_at": string | null,"correct_streak": number,"id": string,"level": string,"objective": string,"path_id": string,"position": number,"prerequisites": (number)[],"status": string,"title": string,"topic_ids": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts_count"?: number,"completed_at"?: string | null,"correct_streak"?: number,"id"?: string,"level"?: string,"objective": string,"path_id": string,"position": number,"prerequisites"?: (number)[],"status"?: string,"title": string,"topic_ids"?: (string)[],"user_id"?: string
                  }
                  Update: {
                    "attempts_count"?: number,"completed_at"?: string | null,"correct_streak"?: number,"id"?: string,"level"?: string,"objective"?: string,"path_id"?: string,"position"?: number,"prerequisites"?: (number)[],"status"?: string,"title"?: string,"topic_ids"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "path_steps_path_id_fkey"
      columns: ["path_id"]
isOneToOne: false
      referencedRelation: "learning_paths"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_days": {
                  Row: {
                    "date": string,"done": boolean,"id": string,"plan_id": string,"status": string,"tasks_json": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "date": string,"done"?: boolean,"id"?: string,"plan_id": string,"status"?: string,"tasks_json"?: NonNullable<Json>,"user_id"?: string
                  }
                  Update: {
                    "date"?: string,"done"?: boolean,"id"?: string,"plan_id"?: string,"status"?: string,"tasks_json"?: NonNullable<Json>,"user_id"?: string
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
                    "created_at": string,"id": string,"name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "answer": string,"chunk_id": string | null,"created_at": string,"difficulty": string | null,"explanation": string | null,"id": string,"options_json": Json | null,"origin": string,"rubric_json": Json | null,"source_page": number | null,"source_quote": string | null,"stem": string,"style": string | null,"subject_id": string,"topic_id": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"chunk_id"?: string | null,"created_at"?: string,"difficulty"?: string | null,"explanation"?: string | null,"id"?: string,"options_json"?: Json | null,"origin"?: string,"rubric_json"?: Json | null,"source_page"?: number | null,"source_quote"?: string | null,"stem": string,"style"?: string | null,"subject_id": string,"topic_id"?: string | null,"type": string,"user_id"?: string
                  }
                  Update: {
                    "answer"?: string,"chunk_id"?: string | null,"created_at"?: string,"difficulty"?: string | null,"explanation"?: string | null,"id"?: string,"options_json"?: Json | null,"origin"?: string,"rubric_json"?: Json | null,"source_page"?: number | null,"source_quote"?: string | null,"stem"?: string,"style"?: string | null,"subject_id"?: string,"topic_id"?: string | null,"type"?: string,"user_id"?: string
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
                },"quizzes": {
                  Row: {
                    "created_at": string,"difficulty": string,"finished_at": string | null,"id": string,"material_id": string | null,"mode": string,"question_ids": (string)[],"started_at": string | null,"style": string | null,"subject_id": string,"time_limit_s": number | null,"title": string,"topic_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"difficulty"?: string,"finished_at"?: string | null,"id"?: string,"material_id"?: string | null,"mode"?: string,"question_ids"?: (string)[],"started_at"?: string | null,"style"?: string | null,"subject_id": string,"time_limit_s"?: number | null,"title": string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"difficulty"?: string,"finished_at"?: string | null,"id"?: string,"material_id"?: string | null,"mode"?: string,"question_ids"?: (string)[],"started_at"?: string | null,"style"?: string | null,"subject_id"?: string,"time_limit_s"?: number | null,"title"?: string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quizzes_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quizzes_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quizzes_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "due_at": string,"fsrs_state_json": NonNullable<Json>,"id": string,"item_id": string,"item_type": string,"last_reviewed_at": string | null,"subject_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "due_at"?: string,"fsrs_state_json"?: NonNullable<Json>,"id"?: string,"item_id": string,"item_type": string,"last_reviewed_at"?: string | null,"subject_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "due_at"?: string,"fsrs_state_json"?: NonNullable<Json>,"id"?: string,"item_id"?: string,"item_type"?: string,"last_reviewed_at"?: string | null,"subject_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"room_attempts": {
                  Row: {
                    "answers_json": NonNullable<Json>,"correct": number,"created_at": string,"id": string,"room_id": string,"room_quiz_id": string,"time_ms": number | null,"total": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers_json"?: NonNullable<Json>,"correct": number,"created_at"?: string,"id"?: string,"room_id": string,"room_quiz_id": string,"time_ms"?: number | null,"total": number,"user_id"?: string
                  }
                  Update: {
                    "answers_json"?: NonNullable<Json>,"correct"?: number,"created_at"?: string,"id"?: string,"room_id"?: string,"room_quiz_id"?: string,"time_ms"?: number | null,"total"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_attempts_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_attempts_room_quiz_id_fkey"
      columns: ["room_quiz_id"]
isOneToOne: false
      referencedRelation: "room_quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"room_materials": {
                  Row: {
                    "created_at": string,"id": string,"material_id": string,"room_id": string,"shared_by": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"material_id": string,"room_id": string,"shared_by"?: string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"material_id"?: string,"room_id"?: string,"shared_by"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_materials_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_materials_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
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
                },"room_quiz_keys": {
                  Row: {
                    "answers_json": NonNullable<Json>,"room_quiz_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers_json": NonNullable<Json>,"room_quiz_id": string
                  }
                  Update: {
                    "answers_json"?: NonNullable<Json>,"room_quiz_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_quiz_keys_room_quiz_id_fkey"
      columns: ["room_quiz_id"]
isOneToOne: true
      referencedRelation: "room_quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"room_quizzes": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"questions_json": NonNullable<Json>,"room_id": string,"time_limit_s": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"questions_json": NonNullable<Json>,"room_id": string,"time_limit_s": number,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"questions_json"?: NonNullable<Json>,"room_id"?: string,"time_limit_s"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_quizzes_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"id": string,"invite_code": string,"name": string,"owner_id": string,"subject_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"name"?: string,"owner_id"?: string,"subject_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"name"?: string,"owner_id"?: string,"subject_id"?: string | null
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
                    "generated_at": string,"id": string,"params_json": NonNullable<Json>,"subject_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "generated_at"?: string,"id"?: string,"params_json"?: NonNullable<Json>,"subject_id": string,"user_id"?: string
                  }
                  Update: {
                    "generated_at"?: string,"id"?: string,"params_json"?: NonNullable<Json>,"subject_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_plans_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: true
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "ended_at": string,"focus_minutes": number,"goals_json": NonNullable<Json>,"id": string,"scene": string | null,"subject_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string,"focus_minutes": number,"goals_json"?: NonNullable<Json>,"id"?: string,"scene"?: string | null,"subject_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "ended_at"?: string,"focus_minutes"?: number,"goals_json"?: NonNullable<Json>,"id"?: string,"scene"?: string | null,"subject_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_sessions_subject_id_fkey"
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
                },"summaries": {
                  Row: {
                    "content_json": NonNullable<Json>,"created_at": string,"id": string,"material_id": string,"subject_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_json": NonNullable<Json>,"created_at"?: string,"id"?: string,"material_id": string,"subject_id": string,"user_id"?: string
                  }
                  Update: {
                    "content_json"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"material_id"?: string,"subject_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "summaries_material_id_fkey"
      columns: ["material_id"]
isOneToOne: true
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "summaries_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_profiles": {
                  Row: {
                    "created_at": string,"exams_count": number,"id": string,"likely_topics_json": NonNullable<Json>,"style_json": NonNullable<Json>,"subject_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exams_count"?: number,"id"?: string,"likely_topics_json"?: NonNullable<Json>,"style_json"?: NonNullable<Json>,"subject_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"exams_count"?: number,"id"?: string,"likely_topics_json"?: NonNullable<Json>,"style_json"?: NonNullable<Json>,"subject_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_profiles_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: true
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"position": number,"subject_id": string,"summary": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"position"?: number,"subject_id": string,"summary"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"position"?: number,"subject_id"?: string,"summary"?: string | null,"user_id"?: string
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
                },"tutor_messages": {
                  Row: {
                    "content_json": NonNullable<Json>,"created_at": string,"id": string,"kind": string,"question_id": string | null,"role": string,"step_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_json"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind": string,"question_id"?: string | null,"role": string,"step_id": string,"user_id"?: string
                  }
                  Update: {
                    "content_json"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind"?: string,"question_id"?: string | null,"role"?: string,"step_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tutor_messages_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tutor_messages_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "path_steps"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_ai_usage":
{ Args: { "p_calls": number,"p_day": string,"p_in": number,"p_out": number,"p_user": string }; Returns: undefined
                           },
"claim_jobs":
{ Args: { "n"?: number,"p_user_id"?: string }; Returns: {
              "attempts": number,
"created_at": string,
"error": string | null,
"id": string,
"kind": string,
"payload_json": NonNullable<Json>,
"status": string,
"updated_at": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "jobs"
        isOneToOne: false
        isSetofReturn: true
      } },
"is_room_member":
{ Args: { "p_room_id": string }; Returns: boolean
                           },
"join_room":
{ Args: { "p_code": string }; Returns: string
                           },
"match_chunks":
{ Args: { "k"?: number,"p_subject_id": string,"query_embedding": string }; Returns: {
              "content": string,"id": string,"material_id": string,"page": number,"similarity": number
            }[]
                           },
"match_material_chunks":
{ Args: { "k"?: number,"p_material_id": string,"query_embedding": string }; Returns: {
              "content": string,"id": string,"material_id": string,"page": number,"similarity": number
            }[]
                           },
"match_user_chunks":
{ Args: { "k"?: number,"query_embedding": string }; Returns: {
              "content": string,"id": string,"material_id": string,"page": number,"similarity": number,"subject_id": string
            }[]
                           },
"owns_subject":
{ Args: { "p_subject_id": string }; Returns: boolean
                           },
"room_member_names":
{ Args: { "p_room_id": string }; Returns: {
              "joined_at": string,"name": string,"user_id": string
            }[]
                           },
"room_weekly_ranking":
{ Args: { "p_room_id": string }; Returns: {
              "name": string,"own_correct": number,"points": number,"room_correct": number,"user_id": string
            }[]
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
