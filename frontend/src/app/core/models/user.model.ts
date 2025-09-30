export interface User {
  id?: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  active?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
} 