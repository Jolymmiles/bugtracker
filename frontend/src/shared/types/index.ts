export interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_admin: boolean;
}

export interface Card {
  id: number;
  user_id: number;
  title: string;
  description: string;
  type: 'issue' | 'suggestion';
  status: 'open' | 'closed' | 'fixed' | 'fix_coming';
  images?: string[];
  rating: number;
  likes: number;
  dislikes: number;
  created_at: string;
  author?: User;
  comment_count: number;
  user_vote?: number;
}

export interface Comment {
  id: number;
  card_id: number;
  user_id: number;
  content: string;
  images?: string[];
  created_at: string;
  author?: User;
}

export interface CardsResponse {
  cards: Card[];
  total: number;
  has_more: boolean;
}

export interface CardDetailResponse {
  card: Card;
  comments: Comment[];
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export type SortType = 'rate' | 'time';
export type CardType = 'issue' | 'suggestion' | '';
export type StatusType = 'open' | 'fix_coming' | 'fixed' | 'closed';

export interface Attachment {
  url: string;
  type: 'image' | 'video' | 'file';
  filename: string;
}
