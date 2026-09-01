import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignupDto } from './dto/signup.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signUpDto: SignupDto) {
    const existingUser = await this.usersService.findByEmail(signUpDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(signUpDto.password, salt);
    const createUserDto: CreateUserDto = {
      name: signUpDto.name,
      email: signUpDto.email,
      password: hashedPassword,
    };
    try {
      const user = await this.usersService.createUser(createUserDto);
      return {
        message: 'User created successfully.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create user.');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid Email Id');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Password');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

}
