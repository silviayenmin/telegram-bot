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
  private readonly dbFilePath = path.join(process.cwd(), 'data', 'database.json');
  private orders: OrderItem[] = [];

  onModuleInit() {
    this.loadDatabase();
  }

  /**
   * Reads data/database.json directly from disk
   */
  loadDatabase(): OrderItem[] {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const content = fs.readFileSync(this.dbFilePath, 'utf-8');
        this.orders = JSON.parse(content);
        this.logger.log(`📁 Loaded ${this.orders.length} orders from ${this.dbFilePath}`);
      } else {
        this.orders = [];
        this.saveDatabase();
      }
    } catch (error) {
      this.logger.error(`Error loading database.json: ${error.message}`);
    }
    return this.orders;
  }

  /**
   * Saves orders array directly to data/database.json
   */
  private saveDatabase() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.orders, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error(`Error writing to database.json: ${error.message}`);
    }
  }

  /**
   * Handles incoming webhook updates:
   * When user clicks "View Orders" or "/orders", reads from database.json and formats response!
   */
  async processUpdate(payload: TelegramWebhookDto) {
    const { chat, message, sender, buttonClicked } = payload;
    const action = (buttonClicked || message?.text || '').trim();
    const groupName = chat.title || (chat.id.startsWith('-') ? 'Group' : 'Direct Message');
    const userName = sender?.name || 'User';

    this.logger.log(`Processing action: "${action}" from ${userName} in ${groupName} (${chat.id})`);

    // Reload from disk to always get latest data
    const currentOrders = this.loadDatabase();

    let replyText = '';

    // If user clicked View Orders or sent /orders command
    if (
      action === 'MENU_ORDERS' ||
      action.toLowerCase() === 'view orders' ||
      action.toLowerCase().includes('/orders')
    ) {
      if (currentOrders.length === 0) {
        replyText = `📦 No orders found in the database.`;
      } else {
        const orderLines = currentOrders
          .map(
            (o, i) =>
              `${i + 1}. 🆔 ${o.orderId} | ${o.item}\n   👤 ${o.customer} | ₹${o.amount.toLocaleString('en-IN')} | [${o.status}]`,
          )
          .join('\n\n');

        replyText =
          `📦 ORDERS DATABASE (${currentOrders.length} items):\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `${orderLines}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📍 Requested from: ${groupName} (ID: ${chat.id})\n` +
          `👤 By: ${userName}`;
      }
    } else if (action.toLowerCase().includes('/support')) {
      replyText =
        `💬 CUSTOMER SUPPORT:\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `For order assistance or help, please contact:\n` +
        `📧 support@silviagroup.com\n` +
        `📞 +91 98765 43210\n` +
        `📍 Group: ${groupName}`;
    } else if (action.toLowerCase().includes('/status')) {
      const delivered = currentOrders.filter((o) => o.status === 'Delivered').length;
      const transit = currentOrders.filter((o) => o.status === 'In Transit').length;
      const processing = currentOrders.filter((o) => o.status === 'Processing').length;

      replyText =
        `📊 ORDERS DATABASE STATUS:\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Total Orders: ${currentOrders.length}\n` +
        `✅ Delivered: ${delivered}\n` +
        `🚚 In Transit: ${transit}\n` +
        `⏳ Processing: ${processing}\n` +
        `📍 Group: ${groupName}`;
    } else {
      // Check if it's a new order being submitted
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
          `Use the [/] Menu button or type /orders to view all orders stored in the database.`;
      }
    }

    return {
      success: true,
      totalOrders: currentOrders.length,
      orders: currentOrders,
      replyText,
    };
  }

  /**
   * API to get all orders from the JSON database
   */
  getAllOrders() {
    return this.loadDatabase();
  }

  /**
   * API to get a single order by ID from the JSON database
   */
  findByOrderId(orderId: string) {
    const orders = this.loadDatabase();
    return orders.find((o) => o.orderId.toLowerCase() === orderId.toLowerCase()) || null;
  }

  private parseNewOrder(text: string): OrderItem | null {
    const get = (label: string): string | null => {
      const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
      return match?.[1]?.trim() ?? null;
    };

    const orderId = get('Order ID') || get('OrderId') || get('Order');
    if (!orderId) return null;

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
