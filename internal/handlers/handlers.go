package handlers

import (
	"html/template"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"bugtracker/internal/auth"
	"bugtracker/internal/config"
	"bugtracker/internal/imgbb"
	"bugtracker/internal/models"
	"bugtracker/internal/repository"
)

type Handler struct {
	repo      *repository.Repository
	cfg       *config.Config
	templates *template.Template
	imgbb     *imgbb.Client
}

func New(repo *repository.Repository, cfg *config.Config) *Handler {
	funcMap := template.FuncMap{
		"timeAgo": timeAgo,
		"truncate": func(s string, n int) string {
			if len(s) <= n {
				return s
			}
			return s[:n] + "..."
		},
		"statusClass": func(s string) string {
			switch s {
			case "fixed":
				return "status-fixed"
			case "closed":
				return "status-closed"
			case "fix_coming":
				return "status-fix-coming"
			default:
				return "status-open"
			}
		},
		"capitalize": func(s string) string {
			if s == "" {
				return s
			}
			return strings.ToUpper(s[:1]) + s[1:]
		},
		"dict": func(values ...interface{}) map[string]interface{} {
			if len(values)%2 != 0 {
				return nil
			}
			m := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil
				}
				m[key] = values[i+1]
			}
			return m
		},
		"mod": func(a, b int64) int64 {
			return a % b
		},
		"slice": func(s string, start, end int) string {
			if start >= len(s) {
				return ""
			}
			if end > len(s) {
				end = len(s)
			}
			return s[start:end]
		},
	}

	tmpl := template.Must(template.New("").Funcs(funcMap).ParseGlob("web/templates/*.html"))
	return &Handler{
		repo:      repo,
		cfg:       cfg,
		templates: tmpl,
		imgbb:     imgbb.New(cfg.ImgBBApiKey),
	}
}

func timeAgo(t time.Time) string {
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		if m == 1 {
			return "1 minute ago"
		}
		return strconv.Itoa(m) + " minutes ago"
	case d < 24*time.Hour:
		h := int(d.Hours())
		if h == 1 {
			return "1 hour ago"
		}
		return strconv.Itoa(h) + " hours ago"
	case d < 30*24*time.Hour:
		days := int(d.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return strconv.Itoa(days) + " days ago"
	default:
		return t.Format("Jan 2, 2006")
	}
}

func (h *Handler) render(c *fiber.Ctx, name string, data fiber.Map) error {
	if data == nil {
		data = fiber.Map{}
	}
	data["User"] = c.Locals("user")
	data["BotUsername"] = h.cfg.BotUsername

	c.Set("Content-Type", "text/html; charset=utf-8")
	return h.templates.ExecuteTemplate(c.Response().BodyWriter(), name, data)
}

// Auth middleware
func (h *Handler) AuthMiddleware(c *fiber.Ctx) error {
	sessionID := c.Cookies("session_id")
	if sessionID != "" {
		userID, _ := strconv.ParseInt(sessionID, 10, 64)
		user, _ := h.repo.GetUser(userID)
		if user != nil {
			c.Locals("user", user)
		}
	}
	return c.Next()
}

// Pages
func (h *Handler) Index(c *fiber.Ctx) error {
	sort := c.Query("sort", "rate")
	cardType := c.Query("type")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	var userID int64
	if user, ok := c.Locals("user").(*models.User); ok && user != nil {
		userID = user.ID
	}

	cards, total, err := h.repo.ListCards(sort, cardType, status, limit, offset, userID)
	if err != nil {
		return c.Status(500).SendString("Error loading cards")
	}

	hasMore := offset+len(cards) < total

	if c.Get("HX-Request") == "true" {
		return h.render(c, "cards_list", fiber.Map{
			"Cards":    cards,
			"HasMore":  hasMore,
			"NextPage": page + 1,
			"Sort":     sort,
			"Type":     cardType,
			"Status":   status,
		})
	}

	return h.render(c, "index", fiber.Map{
		"Cards":    cards,
		"Total":    total,
		"HasMore":  hasMore,
		"Page":     page,
		"NextPage": page + 1,
		"Sort":     sort,
		"Type":     cardType,
		"Status":   status,
		"Query":    c.Query("query"),
	})
}

func (h *Handler) CardPage(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	card, err := h.repo.GetCard(id)
	if err != nil || card == nil {
		return c.Status(404).SendString("Card not found")
	}

	var userID int64
	if user, ok := c.Locals("user").(*models.User); ok && user != nil {
		userID = user.ID
		card.UserVote, _ = h.repo.GetUserVote(userID, card.ID)
	}

	comments, _ := h.repo.GetComments(id)

	return h.render(c, "card", fiber.Map{
		"Card":     card,
		"Comments": comments,
	})
}

func (h *Handler) NewCardPage(c *fiber.Ctx) error {
	if c.Locals("user") == nil {
		return c.Redirect("/")
	}
	return h.render(c, "new_card", nil)
}

// API
func (h *Handler) TelegramAuth(c *fiber.Ctx) error {
	var data models.TelegramAuthData
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid data"})
	}

	if !auth.VerifyTelegramAuth(data, h.cfg.BotToken) {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid auth"})
	}

	user := &models.User{
		ID:        data.ID,
		FirstName: data.FirstName,
		LastName:  data.LastName,
		Username:  data.Username,
		PhotoURL:  data.PhotoURL,
		AuthDate:  time.Unix(data.AuthDate, 0),
	}

	if err := h.repo.UpsertUser(user); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	c.Cookie(&fiber.Cookie{
		Name:     "session_id",
		Value:    strconv.FormatInt(user.ID, 10),
		Path:     "/",
		MaxAge:   86400 * 30,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
	})

	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:   "session_id",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	return c.Redirect("/")
}

func (h *Handler) CreateCard(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).SendString("Unauthorized")
	}

	card := &models.Card{
		UserID:      user.ID,
		Title:       c.FormValue("title"),
		Description: c.FormValue("description"),
		Type:        c.FormValue("type", "issue"),
		Status:      "open",
		Images:      []string{},
		CreatedAt:   time.Now(),
	}

	if card.Title == "" {
		return c.Status(400).SendString("Title is required")
	}

	if err := h.repo.CreateCard(card); err != nil {
		return c.Status(500).SendString("Error creating card")
	}

	c.Set("HX-Redirect", "/c/"+strconv.FormatInt(card.ID, 10))
	return c.SendStatus(200)
}

func (h *Handler) Vote(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).SendString("Login required")
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	value, _ := strconv.Atoi(c.FormValue("value", "0"))

	if value != -1 && value != 0 && value != 1 {
		return c.Status(400).SendString("Invalid vote value")
	}

	currentVote, _ := h.repo.GetUserVote(user.ID, cardID)
	if currentVote == value {
		value = 0
	}

	if err := h.repo.Vote(user.ID, cardID, value); err != nil {
		return c.Status(500).SendString("Error voting")
	}

	card, _ := h.repo.GetCard(cardID)
	if card == nil {
		return c.Status(404).SendString("Card not found")
	}
	card.UserVote = value

	return h.render(c, "vote_buttons", fiber.Map{"Card": card})
}

func (h *Handler) CreateComment(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).SendString("Login required")
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	content := strings.TrimSpace(c.FormValue("content"))

	if content == "" {
		return c.Status(400).SendString("Comment cannot be empty")
	}

	comment := &models.Comment{
		CardID:    cardID,
		UserID:    user.ID,
		Content:   content,
		CreatedAt: time.Now(),
		Author:    user,
	}

	if err := h.repo.CreateComment(comment); err != nil {
		return c.Status(500).SendString("Error creating comment")
	}

	return h.render(c, "comment", fiber.Map{"Comment": comment})
}

func (h *Handler) UpdateCardStatus(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil || !user.IsAdmin {
		return c.Status(403).SendString("Admin only")
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	status := c.FormValue("status")

	if err := h.repo.UpdateCardStatus(cardID, status); err != nil {
		return c.Status(500).SendString("Error updating status")
	}

	return c.SendString(status)
}
