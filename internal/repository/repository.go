package repository

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/lib/pq"

	"bugtracker/internal/models"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// User operations
func (r *Repository) UpsertUser(u *models.User) error {
	_, err := r.db.Exec(`
		INSERT INTO users (id, first_name, last_name, username, photo_url, auth_date, is_admin)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT(id) DO UPDATE SET
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			username = EXCLUDED.username,
			photo_url = EXCLUDED.photo_url,
			auth_date = EXCLUDED.auth_date
	`, u.ID, u.FirstName, u.LastName, u.Username, u.PhotoURL, u.AuthDate, u.IsAdmin)
	return err
}

func (r *Repository) GetUser(id int64) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, first_name, COALESCE(last_name, ''), COALESCE(username, ''), COALESCE(photo_url, ''), auth_date, is_admin
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.FirstName, &u.LastName, &u.Username, &u.PhotoURL, &u.AuthDate, &u.IsAdmin)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return u, err
}

// Card operations
func (r *Repository) CreateCard(c *models.Card) error {
	err := r.db.QueryRow(`
		INSERT INTO cards (user_id, title, description, type, status, images, rating, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
		RETURNING id
	`, c.UserID, c.Title, c.Description, c.Type, c.Status, pq.Array(c.Images), time.Now()).Scan(&c.ID)
	return err
}

func (r *Repository) GetCard(id int64) (*models.Card, error) {
	c := &models.Card{Author: &models.User{}}
	err := r.db.QueryRow(`
		SELECT c.id, c.user_id, c.title, COALESCE(c.description, ''), c.type, c.status, COALESCE(c.images, '{}'), c.rating, c.created_at,
		       u.id, u.first_name, COALESCE(u.last_name, ''), COALESCE(u.username, ''), COALESCE(u.photo_url, ''),
		       (SELECT COUNT(*) FROM comments WHERE card_id = c.id),
		       (SELECT COUNT(*) FROM votes WHERE card_id = c.id AND value = 1),
		       (SELECT COUNT(*) FROM votes WHERE card_id = c.id AND value = -1)
		FROM cards c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = $1
	`, id).Scan(
		&c.ID, &c.UserID, &c.Title, &c.Description, &c.Type, &c.Status, pq.Array(&c.Images), &c.Rating, &c.CreatedAt,
		&c.Author.ID, &c.Author.FirstName, &c.Author.LastName, &c.Author.Username, &c.Author.PhotoURL,
		&c.CommentCount, &c.Likes, &c.Dislikes,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *Repository) ListCards(sort, cardType, status string, limit, offset int, userID int64) ([]*models.Card, int, error) {
	baseQuery := `
		SELECT c.id, c.user_id, c.title, COALESCE(c.description, ''), c.type, c.status, COALESCE(c.images, '{}'), c.rating, c.created_at,
		       u.id, u.first_name, COALESCE(u.last_name, ''), COALESCE(u.username, ''), COALESCE(u.photo_url, ''),
		       (SELECT COUNT(*) FROM comments WHERE card_id = c.id),
		       COALESCE((SELECT value FROM votes WHERE card_id = c.id AND user_id = $1), 0),
		       (SELECT COUNT(*) FROM votes WHERE card_id = c.id AND value = 1),
		       (SELECT COUNT(*) FROM votes WHERE card_id = c.id AND value = -1)
		FROM cards c
		JOIN users u ON c.user_id = u.id
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM cards WHERE 1=1`
	args := []interface{}{userID}
	countArgs := []interface{}{}
	argNum := 2

	if cardType != "" {
		baseQuery += " AND c.type = $" + itoa(argNum)
		countQuery += " AND type = $" + itoa(len(countArgs)+1)
		args = append(args, cardType)
		countArgs = append(countArgs, cardType)
		argNum++
	}
	if status != "" {
		baseQuery += " AND c.status = $" + itoa(argNum)
		countQuery += " AND status = $" + itoa(len(countArgs)+1)
		args = append(args, status)
		countArgs = append(countArgs, status)
		argNum++
	}

	switch sort {
	case "time":
		baseQuery += " ORDER BY c.created_at DESC"
	default:
		baseQuery += " ORDER BY c.rating DESC, c.created_at DESC"
	}

	baseQuery += " LIMIT $" + itoa(argNum) + " OFFSET $" + itoa(argNum+1)
	args = append(args, limit, offset)

	var total int
	r.db.QueryRow(countQuery, countArgs...).Scan(&total)

	rows, err := r.db.Query(baseQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var cards []*models.Card
	for rows.Next() {
		c := &models.Card{Author: &models.User{}}
		err := rows.Scan(
			&c.ID, &c.UserID, &c.Title, &c.Description, &c.Type, &c.Status, pq.Array(&c.Images), &c.Rating, &c.CreatedAt,
			&c.Author.ID, &c.Author.FirstName, &c.Author.LastName, &c.Author.Username, &c.Author.PhotoURL,
			&c.CommentCount, &c.UserVote, &c.Likes, &c.Dislikes,
		)
		if err != nil {
			return nil, 0, err
		}
		cards = append(cards, c)
	}
	return cards, total, nil
}

func itoa(i int) string {
	return strconv.Itoa(i)
}

func (r *Repository) ListCardsWithSearch(sort, cardType, status, query string, limit, offset int, userID int64) ([]*models.Card, int, error) {
	baseQuery := `
		SELECT c.id, c.user_id, c.title, COALESCE(c.description, ''), c.type, c.status, COALESCE(c.images, '{}'), c.rating, c.created_at,
		       u.id, u.first_name, COALESCE(u.last_name, ''), COALESCE(u.username, ''), COALESCE(u.photo_url, ''),
		       (SELECT COUNT(*) FROM comments WHERE card_id = c.id),
		       COALESCE((SELECT value FROM votes WHERE card_id = c.id AND user_id = $1), 0),
		       (SELECT COUNT(*) FROM votes WHERE card_id = c.id AND value = 1),
		       (SELECT COUNT(*) FROM votes WHERE card_id = c.id AND value = -1)
		FROM cards c
		JOIN users u ON c.user_id = u.id
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM cards WHERE 1=1`
	args := []interface{}{userID}
	countArgs := []interface{}{}
	argNum := 2

	if query != "" {
		baseQuery += " AND (c.title ILIKE '%' || $" + itoa(argNum) + " || '%' OR c.description ILIKE '%' || $" + itoa(argNum) + " || '%')"
		countQuery += " AND (title ILIKE '%' || $" + itoa(len(countArgs)+1) + " || '%' OR description ILIKE '%' || $" + itoa(len(countArgs)+1) + " || '%')"
		args = append(args, query)
		countArgs = append(countArgs, query)
		argNum++
	}
	if cardType != "" {
		baseQuery += " AND c.type = $" + itoa(argNum)
		countQuery += " AND type = $" + itoa(len(countArgs)+1)
		args = append(args, cardType)
		countArgs = append(countArgs, cardType)
		argNum++
	}
	if status != "" {
		baseQuery += " AND c.status = $" + itoa(argNum)
		countQuery += " AND status = $" + itoa(len(countArgs)+1)
		args = append(args, status)
		countArgs = append(countArgs, status)
		argNum++
	}

	switch sort {
	case "time":
		baseQuery += " ORDER BY c.created_at DESC"
	default:
		baseQuery += " ORDER BY c.rating DESC, c.created_at DESC"
	}

	baseQuery += " LIMIT $" + itoa(argNum) + " OFFSET $" + itoa(argNum+1)
	args = append(args, limit, offset)

	var total int
	r.db.QueryRow(countQuery, countArgs...).Scan(&total)

	rows, err := r.db.Query(baseQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var cards []*models.Card
	for rows.Next() {
		c := &models.Card{Author: &models.User{}}
		err := rows.Scan(
			&c.ID, &c.UserID, &c.Title, &c.Description, &c.Type, &c.Status, pq.Array(&c.Images), &c.Rating, &c.CreatedAt,
			&c.Author.ID, &c.Author.FirstName, &c.Author.LastName, &c.Author.Username, &c.Author.PhotoURL,
			&c.CommentCount, &c.UserVote, &c.Likes, &c.Dislikes,
		)
		if err != nil {
			return nil, 0, err
		}
		cards = append(cards, c)
	}
	return cards, total, nil
}

func (r *Repository) UpdateCardStatus(id int64, status string) error {
	_, err := r.db.Exec("UPDATE cards SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	return err
}

// Vote operations
func (r *Repository) Vote(userID, cardID int64, value int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var oldValue int
	err = tx.QueryRow("SELECT value FROM votes WHERE user_id = $1 AND card_id = $2", userID, cardID).Scan(&oldValue)
	if err == sql.ErrNoRows {
		oldValue = 0
	} else if err != nil {
		return err
	}

	if value == 0 {
		_, err = tx.Exec("DELETE FROM votes WHERE user_id = $1 AND card_id = $2", userID, cardID)
	} else {
		_, err = tx.Exec(`
			INSERT INTO votes (user_id, card_id, value) VALUES ($1, $2, $3)
			ON CONFLICT(user_id, card_id) DO UPDATE SET value = EXCLUDED.value
		`, userID, cardID, value)
	}
	if err != nil {
		return err
	}

	diff := value - oldValue
	_, err = tx.Exec("UPDATE cards SET rating = rating + $1 WHERE id = $2", diff, cardID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) GetUserVote(userID, cardID int64) (int, error) {
	var value int
	err := r.db.QueryRow("SELECT value FROM votes WHERE user_id = $1 AND card_id = $2", userID, cardID).Scan(&value)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return value, err
}

// Comment operations
func (r *Repository) CreateComment(c *models.Comment) error {
	err := r.db.QueryRow(`
		INSERT INTO comments (card_id, user_id, content, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, c.CardID, c.UserID, c.Content, time.Now()).Scan(&c.ID)
	return err
}

func (r *Repository) GetComments(cardID int64) ([]*models.Comment, error) {
	rows, err := r.db.Query(`
		SELECT c.id, c.card_id, c.user_id, c.content, c.created_at,
		       u.id, u.first_name, COALESCE(u.last_name, ''), COALESCE(u.username, ''), COALESCE(u.photo_url, '')
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.card_id = $1
		ORDER BY c.created_at ASC
	`, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		c := &models.Comment{Author: &models.User{}}
		err := rows.Scan(
			&c.ID, &c.CardID, &c.UserID, &c.Content, &c.CreatedAt,
			&c.Author.ID, &c.Author.FirstName, &c.Author.LastName, &c.Author.Username, &c.Author.PhotoURL,
		)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, nil
}

func (r *Repository) DeleteCard(id int64) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM comments WHERE card_id = $1", id)
	if err != nil {
		return err
	}
	_, err = tx.Exec("DELETE FROM votes WHERE card_id = $1", id)
	if err != nil {
		return err
	}
	_, err = tx.Exec("DELETE FROM cards WHERE id = $1", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) DeleteComment(id int64) error {
	_, err := r.db.Exec("DELETE FROM comments WHERE id = $1", id)
	return err
}
