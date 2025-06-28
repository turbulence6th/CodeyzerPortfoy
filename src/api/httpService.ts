import axios from 'axios';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

// Capacitor HTTP servis wrapper'ı
export class HttpService {
  private static isNative = Capacitor.isNativePlatform();

  static async get(url: string, config?: any) {
    if (this.isNative) {
      // Native platformda Capacitor HTTP kullan
      const response = await CapacitorHttp.get({
        url,
        headers: config?.headers || {},
        params: config?.params || {},
      });
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } else {
      // Web'de axios kullan
      return axios.get(url, config);
    }
  }

  static async post(url: string, data?: any, config?: any) {
    if (this.isNative) {
      // Native platformda Capacitor HTTP kullan
      const response = await CapacitorHttp.post({
        url,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...config?.headers,
        },
      });
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } else {
      // Web'de axios kullan
      return axios.post(url, data, config);
    }
  }
} 