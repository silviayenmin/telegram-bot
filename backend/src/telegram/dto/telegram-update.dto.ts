import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ChatDto {
  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : value))
  @IsString()
  @IsNotEmpty()
  id: string; // Store as string to avoid 64-bit integer precision loss

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class SenderDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : value))
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class MessageDto {
  @IsOptional()
  @Type(() => Number)
  id?: number;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @Type(() => Number)
  date?: number;
}

export class CallbackQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : value))
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  data?: string;
}

export class TelegramWebhookDto {
  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  eventType: string; // 'NEW_MESSAGE' | 'BUTTON_CLICK' | 'CALLBACK_QUERY'

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  updateId: number;

  @ValidateNested()
  @Type(() => ChatDto)
  chat: ChatDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessageDto)
  message?: MessageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SenderDto)
  sender?: SenderDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CallbackQueryDto)
  callbackQuery?: CallbackQueryDto;

  @IsOptional()
  @IsString()
  buttonClicked?: string; // Callback data from the clicked button

  @IsOptional()
  rawUpdate?: any;
}
