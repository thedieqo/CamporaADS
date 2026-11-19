import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../interface/auth.controller';
import { LoginUseCase } from '../application/login.usecase';
import { PrismaUserAuthAdapter } from './prisma-user-auth.adapter';
import { USER_AUTH_PORT } from '../application/ports/user-auth.port';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    JwtStrategy,
    RolesGuard,
    { provide: USER_AUTH_PORT, useClass: PrismaUserAuthAdapter },
  ],
  exports: [JwtModule, RolesGuard],
})
export class AuthModule {}
