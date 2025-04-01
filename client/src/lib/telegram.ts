// Telegram Mini App SDK wrapper
import { nanoid } from 'nanoid';
import { User } from '@/types';

// Define WebApp interface based on Telegram documentation
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready(): void;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
        };
        backButton: {
          hide(): void;
          show(): void;
          onClick(callback: () => void): void;
        };
        close(): void;
        expand(): void;
        ready(): void;
        hideBackButton(): void;
        showBackButton(): void;
        onEvent(event: string, callback: (data: any) => void): void;
        offEvent(event: string, callback: (data: any) => void): void;
        openLink(url: string): void;
        openInvoice(invoiceUrl: string): Promise<string>;
        showShareButton(params: { url: string; text: string }): void;
        requestContact(): Promise<boolean>;
        vibrate(): void;
        showLoading(): void;
        hideLoading(): void;
        showToast(message: string): Promise<void>;
        showConfirm(text: string): Promise<boolean>;
        showOptionButtons(options: { text: string; data: string }[]): Promise<string>;
      };
    };
  }
}

// Check if we are in a Telegram WebApp environment
export function isTelegramWebApp(): boolean {
  return typeof window.Telegram !== 'undefined' && window.Telegram.WebApp !== undefined;
}

// Initialize and setup the Telegram Mini App
export function initializeTelegramApp(): void {
  if (!isTelegramWebApp()) return;

  const tg = window.Telegram.WebApp;

  // Initialize the app
  tg.ready();

  // Handle back button
  tg.backButton.onClick(() => {
    tg.close();
  });

  // Handle closing
  tg.onEvent('close', () => {
    window.close();
  });
}

// Get current Telegram user
export function getTelegramUser(): {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
} | null {
  if (!isTelegramWebApp()) return null;

  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user;

  if (!user) return null;

  return {
    telegramId: user.id.toString(),
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
  };
}

// Authenticate user with Telegram
export async function authenticateTelegramUser(referralCode?: string): Promise<User | null> {
  const telegramUser = getTelegramUser();
  if (!telegramUser) return null;

  // TODO: Implement your authentication logic here
  // For now, just return a mock user
  return {
    id: nanoid(),
    telegramId: telegramUser.telegramId,
    firstName: telegramUser.firstName,
    lastName: telegramUser.lastName,
    username: telegramUser.username,
    photoUrl: telegramUser.photoUrl,
    referralCode: referralCode || null,
    createdAt: new Date(),
  };
}

// Show an alert using Telegram's native UI
export function showAlert(message: string): Promise<void> {
  if (!isTelegramWebApp()) {
    alert(message);
    return Promise.resolve();
  }

  return window.Telegram.WebApp.showToast(message);
}

// Show a confirmation dialog using Telegram's native UI
export function showConfirm(message: string): Promise<boolean> {
  if (!isTelegramWebApp()) {
    return new Promise((resolve) => {
      if (confirm(message)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  return window.Telegram.WebApp.showConfirm(message);
}

// Open a Telegram channel or group
export function openTelegramLink(link: string): void {
  if (!isTelegramWebApp()) {
    window.open(link, '_blank');
    return;
  }

  window.Telegram.WebApp.openLink(link);
}

// Handle payment using Telegram's payment API
export async function openInvoice(url: string): Promise<string> {
  if (!isTelegramWebApp()) {
    throw new Error('Not in Telegram WebApp environment');
  }

  return window.Telegram.WebApp.openInvoice(url);
}

// Share data with Telegram (like referral code)
export function shareWithTelegram(data: string): void {
  if (!isTelegramWebApp()) {
    navigator.share({ text: data });
    return;
  }

  window.Telegram.WebApp.showShareButton({
    url: window.location.href,
    text: data,
  });
}

// Request a contact from user
export function requestContact(): Promise<boolean> {
  if (!isTelegramWebApp()) {
    return new Promise((resolve) => {
      if (confirm('Share your contact?')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  return window.Telegram.WebApp.requestContact();
}

// Provide haptic feedback
export function hapticFeedback(type: 'success' | 'error' | 'warning'): void {
  if (!isTelegramWebApp()) {
    return;
  }

  window.Telegram.WebApp.vibrate();
}

// Close the WebApp
export function closeWebApp(): void {
  if (!isTelegramWebApp()) {
    window.close();
    return;
  }

  window.Telegram.WebApp.close();
}

// Railway PostgreSQL veritabanı bağlantısı
const dbUrl = process.env.DATABASE_URL;
