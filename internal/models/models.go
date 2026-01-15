package models

import "time"

type User struct {
	ID        int64     `json:"id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name,omitempty"`
	Username  string    `json:"username,omitempty"`
	PhotoURL  string    `json:"photo_url,omitempty"`
	AuthDate  time.Time `json:"auth_date"`
	IsAdmin   bool      `json:"is_admin"`
}

type Card struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Type        string    `json:"type"`   // issue, suggestion
	Status      string    `json:"status"` // open, closed, fixed, fix_coming
	Images      []string  `json:"images,omitempty"`
	Rating      int       `json:"rating"`
	Likes       int       `json:"likes"`
	Dislikes    int       `json:"dislikes"`
	CreatedAt   time.Time `json:"created_at"`
	// Joined fields
	Author       *User `json:"author,omitempty"`
	CommentCount int   `json:"comment_count"`
	UserVote     int   `json:"user_vote,omitempty"` // -1, 0, 1
}

type Tag struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type CardTag struct {
	CardID int64 `json:"card_id"`
	TagID  int64 `json:"tag_id"`
}

type Vote struct {
	UserID int64 `json:"user_id"`
	CardID int64 `json:"card_id"`
	Value  int   `json:"value"` // 1 or -1
}

type Comment struct {
	ID        int64     `json:"id"`
	CardID    int64     `json:"card_id"`
	UserID    int64     `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	Author    *User     `json:"author,omitempty"`
}

type TelegramAuthData struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name,omitempty"`
	Username  string `json:"username,omitempty"`
	PhotoURL  string `json:"photo_url,omitempty"`
	AuthDate  int64  `json:"auth_date"`
	Hash      string `json:"hash"`
}
