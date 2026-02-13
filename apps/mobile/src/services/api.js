import { API_URL } from '../utils/config';

class ApiService {
  async createRoom(name, hostId) {
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, hostId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async getRoom(roomId) {
    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}`);

      if (!response.ok) {
        throw new Error('Room not found');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting room:', error);
      throw error;
    }
  }

  async getRoomByShortCode(shortCode) {
    try {
      const code = String(shortCode || '').trim().toUpperCase();
      const response = await fetch(`${API_URL}/api/rooms/by-code/${encodeURIComponent(code)}`);
      if (!response.ok) throw new Error('Room not found');
      return await response.json();
    } catch (error) {
      console.error('Error getting room by short code:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${API_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Server health check failed:', error);
      return null;
    }
  }

  /** 从服务端拉取 ICE 配置（含 TURN），由服务端统一下发 */
  async getIceServers() {
    try {
      const response = await fetch(`${API_URL}/api/ice-servers`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch ICE servers, using defaults:', error?.message);
      return null;
    }
  }
}

export const apiService = new ApiService();
