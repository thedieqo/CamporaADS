import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USER_AUTH_PORT, UserAuthPort } from './ports/user-auth.port';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_AUTH_PORT) private readonly users: UserAuthPort,
    private readonly jwt: JwtService,
  ) {}

  async execute(email: string, password: string) {
    const user = await this.users.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const payload = { sub: user.id, email: user.email, role: user.role, name: user.fullName };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, municipality: user.municipality } };
  }
}
