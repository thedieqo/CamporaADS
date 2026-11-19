import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { UserAuthPort } from '../application/ports/user-auth.port';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaUserAuthAdapter implements UserAuthPort {
  constructor(private readonly prisma: PrismaService) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, municipality: user.municipality };
  }
}
