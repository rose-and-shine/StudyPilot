import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],

  useFactory: (configService: ConfigService) => ({
    type: 'postgres',

    url: configService.get<string>('DATABASE_URL'),

    autoLoadEntities: true,

    synchronize: true,
  }),
};
