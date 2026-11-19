import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../application/login.usecase';
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({ example: 'productor@campora.demo' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '<contraseña configurada>' })
  @IsString()
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly login: LoginUseCase) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión (JWT)' })
  async loginEndpoint(@Body() dto: LoginDto) {
    return this.login.execute(dto.email, dto.password);
  }
}
