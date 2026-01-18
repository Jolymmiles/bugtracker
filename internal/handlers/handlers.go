package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"bugtracker/internal/auth"
	"bugtracker/internal/config"
	"bugtracker/internal/imgbb"
	"bugtracker/internal/models"
	"bugtracker/internal/repository"
	"bugtracker/internal/telegram"
)

type Handler struct {
	repo     *repository.Repository
	cfg      *config.Config
	imgbb    *imgbb.Client
	telegram *telegram.Client
}

func New(repo *repository.Repository, cfg *config.Config) *Handler {
	return &Handler{
		repo:     repo,
		cfg:      cfg,
		imgbb:    imgbb.New(cfg.ImgBBApiKey),
		telegram: telegram.New(cfg.BotToken),
	}
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


