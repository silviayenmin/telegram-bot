
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TelegramWebhookDto } from './dto/telegram-update.dto';

export interface OrderItem {
  orderId: string;
  customer: string;
  item: string;
  amount: number;
  status: string;
  date: string;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);

  private readonly dbFilePath = path.join(
    process.cwd(),
    'data',
    'database.json',
  );

  private orders: OrderItem[] = [];

  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;

  onModuleInit() {
    this.loadDatabase();
  }

  // Load orders from JSON database
  loadDatabase(): OrderItem[] {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const content = fs.readFileSync(this.dbFilePath, 'utf-8');

        this.orders = JSON.parse(content);

        this.logger.log(
          `Loaded ${this.orders.length} orders from database.json`,
        );
      } else {
        this.orders = [];
        this.saveDatabase();
      }
    } catch (error) {
      this.logger.error(`Error loading database: ${error.message}`);
    }

    return this.orders;
  }

  // Save orders to JSON database
  private saveDatabase() {
    try {
      fs.writeFileSync(
        this.dbFilePath,
        JSON.stringify(this.orders, null, 2),
        'utf-8',
      );
    } catch (error) {
      this.logger.error(`Error saving database: ${error.message}`);
    }
  }

  // Send a message to the same Telegram chat
  private async sendTelegramMessage(
    chatId: string | number,
    text: string,
  ) {
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is missing in .env');
    }

    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      this.logger.error(
        `Telegram sendMessage failed: ${JSON.stringify(result)}`,
      );

      throw new Error('Failed to send Telegram message');
    }

    this.logger.log(`Telegram reply sent to chat ${chatId}`);

    return result;
  }

  // Acknowledge button click to stop Telegram loading spinner
  private async answerCallbackQuery(callbackQueryId?: string) {
    if (!callbackQueryId || !this.botToken) {
      return;
    }

    try {
      await fetch(
        `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
          }),
        },
      );
    } catch (error) {
      this.logger.error(
        `Callback acknowledgement failed: ${error.message}`,
      );
    }
  }

  // Process Telegram webhook update
  async processUpdate(payload: TelegramWebhookDto) {
    const { chat, message, sender, callbackQuery } = payload;

    if (!chat?.id) {
      this.logger.error('Chat ID is missing in webhook payload');

      return {
        success: false,
        message: 'Chat ID is missing',
      };
    }

    const chatId = chat.id;
    const chatIdString = String(chatId);

    // Get actual button callback data
    const action = (
      callbackQuery?.data ||
      message?.text ||
      ''
    ).trim();

    const groupName =
      chat.title ||
      (chatIdString.startsWith('-') ? 'Group' : 'Direct Message');

    const userName = sender?.name || 'User';
    this.logger.log('========== TELEGRAM GROUP DETAILS ==========');
this.logger.log(`Group Name: ${groupName}`);
this.logger.log(`Group ID: ${chatId}`);
this.logger.log(`Chat Type: ${chat.type}`);
this.logger.log(`User: ${userName}`);
this.logger.log('============================================');
    this.logger.log(
      `Processing action: "${action}" from ${userName} in ${groupName} (${chatId})`,
    );

    // Acknowledge inline button click
    await this.answerCallbackQuery(callbackQuery?.id);

    // Reload latest database
    const currentOrders = this.loadDatabase();

    let replyText = '';

    const normalizedAction = action.toLowerCase();

    // VIEW ORDERS
    if (
      action === 'MENU_ORDERS' ||
      normalizedAction === 'orders' ||
      normalizedAction === 'view orders' ||
      normalizedAction.includes('/orders')
    ) {
      if (currentOrders.length === 0) {
        replyText = '📦 No orders found in the database.';
      } else {
        const orderLines = currentOrders
          .map(
            (order, index) =>
              `${index + 1}. 🆔 ${order.orderId} | ${order.item}\n` +
              `   👤 ${order.customer} | ₹${order.amount.toLocaleString('en-IN')} | [${order.status}]`,
          )
          .join('\n\n');

        replyText =
          `📦 ORDERS DATABASE (${currentOrders.length} items)\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `${orderLines}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📍 Requested from: ${groupName}\n` +
          `👤 By: ${userName}`;
      }
    }

    // CUSTOMER SUPPORT
    else if (
      normalizedAction === 'support' ||
      normalizedAction === 'menu_support' ||
      normalizedAction.includes('/support')
    ) {
      replyText =
        `💬 CUSTOMER SUPPORT\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `For order assistance or help, please contact:\n` +
        `📧 support@silviagroup.com\n` +
        `📞 +91 98765 43210\n` +
        `📍 Group: ${groupName}`;
    }

    // ACCOUNT STATUS
    else if (
      normalizedAction === 'status' ||
      normalizedAction === 'menu_status' ||
      normalizedAction.includes('/status')
    ) {
      const delivered = currentOrders.filter(
        (order) => order.status === 'Delivered',
      ).length;

      const transit = currentOrders.filter(
        (order) => order.status === 'In Transit',
      ).length;

      const processing = currentOrders.filter(
        (order) => order.status === 'Processing',
      ).length;

      replyText =
        `📊 ORDERS DATABASE STATUS\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Total Orders: ${currentOrders.length}\n` +
        `✅ Delivered: ${delivered}\n` +
        `🚚 In Transit: ${transit}\n` +
        `⏳ Processing: ${processing}\n` +
        `📍 Group: ${groupName}`;
    }

    // NEW ORDER
    else {
      const newOrder = this.parseNewOrder(message?.text || '');

      if (newOrder) {
        this.orders.push(newOrder);
        this.saveDatabase();

        replyText =
          `✅ NEW ORDER ADDED TO DATABASE!\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 ${newOrder.orderId}: ${newOrder.item}\n` +
          `👤 Customer: ${newOrder.customer}\n` +
          `💰 Amount: ₹${newOrder.amount.toLocaleString('en-IN')}\n` +
          `Status: ${newOrder.status}`;
      } else {
        replyText =
          `Hello ${userName}!\n` +
          `Please select an option from the menu below.`;
      }
    }

    // Send actual Telegram message to the originating chat
    // await this.sendTelegramMessage(chatId, replyText);

    return {
      success: true,
      chatId,
      action,
      totalOrders: currentOrders.length,
      replyText,
    };
  }

  // Get all orders
  getAllOrders() {
    return this.loadDatabase();
  }

  // Find order by ID
  findByOrderId(orderId: string) {
    const orders = this.loadDatabase();

    return (
      orders.find(
        (order) =>
          order.orderId.toLowerCase() === orderId.toLowerCase(),
      ) || null
    );
  }

  // Parse new order message
  private parseNewOrder(text: string): OrderItem | null {
    const get = (label: string): string | null => {
      const match = text.match(
        new RegExp(`^${label}:\\s*(.+)$`, 'im'),
      );

      return match?.[1]?.trim() ?? null;
    };

    const orderId =
      get('Order ID') || get('OrderId') || get('Order');

    if (!orderId) {
      return null;
    }

    const amountStr = get('Amount');

    return {
      orderId,
      customer: get('Customer') || get('Name') || 'Guest',
      item: get('Item') || get('Product') || 'General Item',
      amount: amountStr ? parseFloat(amountStr) : 0,
      status: get('Status') || 'Processing',
      date: new Date().toISOString().split('T')[0],
    };
  }
}
