export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  municipality?: string | null;
}
