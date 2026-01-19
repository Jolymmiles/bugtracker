import type { Card, CardsResponse, CardDetailResponse, Comment, User, TelegramAuthData, SortType, CardType, Attachment } from '@/shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Config
  async getConfig(): Promise<{ bot_username: string }> {
    return request('/config');
  },

  // Auth
  async getMe(): Promise<User | null> {
    try {
      return await request<User>('/auth/me');
    } catch {
      return null;
    }
  },

  async loginWithTelegram(data: TelegramAuthData): Promise<{ ok: boolean }> {
    return request('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  // Cards
  async getCards(params: {
    sort?: SortType;
    type?: CardType;
    status?: string;
    page?: number;
    limit?: number;
    query?: string;
  }): Promise<CardsResponse> {
    const searchParams = new URLSearchParams();
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.type) searchParams.set('type', params.type);
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.query) searchParams.set('query', params.query);

    return request(`/cards?${searchParams.toString()}`);
  },

  async getCard(id: number): Promise<CardDetailResponse> {
    return request(`/cards/${id}`);
  },

  async createCard(data: {
    title: string;
    description: string;
    type: string;
    images?: string[];
  }): Promise<Card> {
    return request('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async vote(cardId: number, value: number): Promise<Card> {
    return request(`/cards/${cardId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  },

  // Comments
  async getComments(cardId: number): Promise<Comment[]> {
    return request(`/cards/${cardId}/comments`);
  },

  async createComment(cardId: number, content: string, images?: string[]): Promise<Comment> {
    return request(`/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, images }),
    });
  },

  // Upload
  async uploadFile(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  // Legacy upload for backward compatibility
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  // Admin
  async deleteCard(id: number): Promise<void> {
    await request(`/cards/${id}`, { method: 'DELETE' });
  },

  async deleteComment(id: number): Promise<void> {
    await request(`/comments/${id}`, { method: 'DELETE' });
  },

  async updateCardStatus(id: number, status: string): Promise<Card> {
    return request(`/cards/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
