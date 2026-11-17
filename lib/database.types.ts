export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          body: string;
          created_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          body: string;
          created_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          body?: string;
          created_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
