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

  async checkHealth() {
    try {
      const response = await fetch(`${API_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Server health check failed:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();
