import { AuthUser } from '../../domain/auth-user';

export interface UserAuthPort {
  validateCredentials(email: string, password: string): Promise<(AuthUser & { passwordHash?: string }) | null>;
}
export const USER_AUTH_PORT = Symbol('USER_AUTH_PORT');
