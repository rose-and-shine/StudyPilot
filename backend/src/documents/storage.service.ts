import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly signedUrlExpiry: number;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');

    const secretKey = this.configService.getOrThrow<string>(
      'SUPABASE_SECRET_KEY',
    );

    this.bucket = this.configService.getOrThrow<string>(
      'SUPABASE_STORAGE_BUCKET',
    );

    this.signedUrlExpiry = Number(
      this.configService.getOrThrow<string>('SUPABASE_SIGNED_URL_EXPIRY'),
    );

    this.supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async uploadFile(filePath: string, file: Buffer, contentType: string) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }

    return data;
  }
  async createSignedUrl(filePath: string) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(filePath, this.signedUrlExpiry);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${error.message}`,
      );
    }

    return data.signedUrl;
  }
}
