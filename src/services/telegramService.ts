import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings } from '../types';

/**
 * Escapes HTML special characters for Telegram HTML parse mode
 */
const escapeHTML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const sendTelegramNotification = async (message: string, testCredentials?: { token: string, chatId: string }) => {
  try {
    console.log('Initializing Telegram notification protocol...');
    
    let token: string;
    let chatId: string;

    if (testCredentials) {
      token = testCredentials.token;
      chatId = testCredentials.chatId.toString().trim();
    } else {
      const settingsSnap = await getDoc(doc(db, 'settings', 'admin'));
      
      if (!settingsSnap.exists()) {
        console.error('Telegram Error: Admin settings document not found in Firestore.');
        return;
      }

      const settings = settingsSnap.data() as AppSettings;
      token = settings.telegramBotToken || '';
      chatId = (settings.telegramChatId || '').toString().trim();
    }

    if (!token || !chatId) {
      console.warn('Telegram Error: Bot Token or Chat ID is missing.');
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const maskedToken = token.substring(0, 4) + '...' + token.substring(token.length - 4);

    console.log(`Attempting Telegram API call. Token: ${maskedToken}, Chat: ${chatId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Telegram API Error Response:', data);
      throw new Error(`Telegram API Error: ${data.description || 'Unknown error'}`);
    }

    console.log('Telegram notification delivered successfully.');
    return data;
  } catch (error: any) {
    console.error('Critical Telegram Notification Failure:', error);
    throw error;
  }
};

export const getBotInfo = async (token: string) => {
  try {
    const url = `https://api.telegram.org/bot${token}/getMe`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.description || 'Failed to fetch bot info');
    }
    
    return data.result;
  } catch (error: any) {
    console.error('Telegram GetMe Error:', error);
    throw error;
  }
};

export const getTelegramUpdates = async (token: string) => {
  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.description || 'Failed to fetch updates');
    }
    
    return data.result;
  } catch (error: any) {
    console.error('Telegram GetUpdates Error:', error);
    throw error;
  }
};

export { escapeHTML };
