export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string | number;
          body: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string | number;
          body: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string | number;
          body?: string;
          created_at?: string;
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
