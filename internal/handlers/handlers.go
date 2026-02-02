package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"bugtracker/internal/auth"
	"bugtracker/internal/config"
	"bugtracker/internal/imgbb"
	"bugtracker/internal/models"
	"bugtracker/internal/repository"
	"bugtracker/internal/s3"
	"bugtracker/internal/telegram"
)

type Handler struct {
	repo     *repository.Repository
	cfg      *config.Config
	imgbb    *imgbb.Client
	telegram *telegram.Client
	s3       *s3.Client
}

func New(repo *repository.Repository, cfg *config.Config) *Handler {
	h := &Handler{
		repo:     repo,
		cfg:      cfg,
		imgbb:    imgbb.New(cfg.ImgBBApiKey),
		telegram: telegram.New(cfg.BotToken),
	}

	if cfg.S3Bucket != "" {
		s3Client, err := s3.New(
			cfg.S3Bucket,
			cfg.S3Region,
			cfg.S3Endpoint,
			cfg.S3AccessKeyID,
			cfg.S3SecretAccessKey,
			cfg.S3PublicURL,
		)
		if err != nil {
			log.Printf("Warning: Failed to initialize S3 client: %v", err)
		} else {
			h.s3 = s3Client
			log.Println("S3 client initialized successfully")
		}
	}

	return h
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

// ExternalAuthRedirect redirects to external auth service
func (h *Handler) ExternalAuthRedirect(c *fiber.Ctx) error {
	if h.cfg.ExternalAuthURL == "" {
		return c.Status(501).JSON(fiber.Map{"error": "External auth not configured"})
	}

	returnURL := h.cfg.AppURL + "/auth/callback"
	authURL := h.cfg.ExternalAuthURL + "/api/v1/auth/external?client_id=" +
		url.QueryEscape(h.cfg.ExternalAuthClientID) +
		"&return_url=" + url.QueryEscape(returnURL)

	return c.Redirect(authURL)
}

// ExternalAuthCallback handles callback from external auth service
func (h *Handler) ExternalAuthCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		errorMsg := c.Query("error")
		log.Printf("[ExternalAuth] Error: %s", errorMsg)
		return c.Redirect("/?error=" + errorMsg)
	}

	// Exchange code for user data
	exchangeURL := h.cfg.ExternalAuthURL + "/api/v1/auth/exchange"
	reqBody, _ := json.Marshal(map[string]string{
		"code":          code,
		"client_secret": h.cfg.ExternalAuthClientSecret,
	})

	resp, err := http.Post(exchangeURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		log.Printf("[ExternalAuth] Exchange request failed: %v", err)
		return c.Redirect("/?error=exchange_failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("[ExternalAuth] Exchange failed with status: %d", resp.StatusCode)
		return c.Redirect("/?error=exchange_failed")
	}

	// Log raw response for debugging
	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("[ExternalAuth] Raw response: %s", string(bodyBytes))
	resp.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			TelegramID int64  `json:"telegram_id"`
			Username   string `json:"username"`
			FirstName  string `json:"first_name"`
			LastName   string `json:"last_name"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		log.Printf("[ExternalAuth] Failed to decode response: %v", err)
		return c.Redirect("/?error=decode_failed")
	}

	log.Printf("[ExternalAuth] Received userData: telegram_id=%d, username=%s, first_name=%s",
		response.Data.TelegramID, response.Data.Username, response.Data.FirstName)

	// Create/update user
	user := &models.User{
		ID:        response.Data.TelegramID,
		FirstName: response.Data.FirstName,
		LastName:  response.Data.LastName,
		Username:  response.Data.Username,
		AuthDate:  time.Now(),
	}

	if err := h.repo.UpsertUser(user); err != nil {
		log.Printf("[ExternalAuth] Failed to upsert user: %v", err)
		return c.Redirect("/?error=db_error")
	}

	// Set session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session_id",
		Value:    strconv.FormatInt(user.ID, 10),
		Path:     "/",
		MaxAge:   86400 * 30,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
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
