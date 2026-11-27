import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramWebhookDto } from './dto/telegram-update.dto';

@Controller('api/telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: TelegramWebhookDto,
    @Headers('x-webhook-secret') secret: string,
  ) {
    const expectedSecret = process.env.MAKE_WEBHOOK_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing x-webhook-secret');
    }

    return await this.telegramService.processUpdate(payload);
  }

  /**
   * API: Read all orders from the JSON database
   */
  @Get('orders')
  getAllOrders() {
    return {
      total: this.telegramService.getAllOrders().length,
      orders: this.telegramService.getAllOrders(),
    };
  }

  /**
   * API: Read all data from the JSON database
   */
  @Get('data')
  getAllData() {
    return this.telegramService.getAllOrders();
  }

  /**
   * API: Query JSON database by Order ID
   */
  @Get('orders/:orderId')
  getByOrderId(@Param('orderId') orderId: string) {
    const order = this.telegramService.findByOrderId(orderId);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found in database.json`);
    }
    return order;
  }
}
