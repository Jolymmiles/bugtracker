package handlers

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"bugtracker/internal/auth"
	"bugtracker/internal/models"
	s3client "bugtracker/internal/s3"
)

// API Handlers for React frontend

// GetConfig returns public configuration
func (h *Handler) GetConfig(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"bot_username": h.cfg.BotUsername,
	})
}

// GetMe returns current authenticated user
func (h *Handler) GetMe(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Not authenticated"})
	}
	user.IsAdmin = h.cfg.IsAdmin(user.ID)
	return c.JSON(user)
}

// APILogout handles logout for JSON API
func (h *Handler) APILogout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:   "session_id",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	return c.JSON(fiber.Map{"ok": true})
}

// GetCards returns paginated list of cards as JSON
func (h *Handler) GetCards(c *fiber.Ctx) error {
	sort := c.Query("sort", "rate")
	cardType := c.Query("type")
	status := c.Query("status")
	query := c.Query("query")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var userID int64
	if user, ok := c.Locals("user").(*models.User); ok && user != nil {
		userID = user.ID
	}

	cards, total, err := h.repo.ListCardsWithSearch(sort, cardType, status, query, limit, offset, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error loading cards"})
	}

	hasMore := offset+len(cards) < total

	return c.JSON(fiber.Map{
		"cards":    cards,
		"total":    total,
		"has_more": hasMore,
	})
}

// GetCard returns single card with comments as JSON
func (h *Handler) GetCard(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	card, err := h.repo.GetCard(id)
	if err != nil || card == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Card not found"})
	}

	var userID int64
	if user, ok := c.Locals("user").(*models.User); ok && user != nil {
		userID = user.ID
		card.UserVote, _ = h.repo.GetUserVote(userID, card.ID)
	}

	comments, _ := h.repo.GetComments(id)

	return c.JSON(fiber.Map{
		"card":     card,
		"comments": comments,
	})
}

// APICreateCard creates a new card and returns JSON
func (h *Handler) APICreateCard(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var input struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Type        string   `json:"type"`
		Images      []string `json:"images"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
	}

	if input.Type == "" {
		input.Type = "issue"
	}

	card := &models.Card{
		UserID:      user.ID,
		Title:       input.Title,
		Description: input.Description,
		Type:        input.Type,
		Status:      "open",
		Images:      input.Images,
		CreatedAt:   time.Now(),
		Author:      user,
	}

	if err := h.repo.CreateCard(card); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error creating card"})
	}

	return c.Status(201).JSON(card)
}

// APIVote handles voting and returns updated card as JSON
func (h *Handler) APIVote(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)

	var input struct {
		Value int `json:"value"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Value != -1 && input.Value != 0 && input.Value != 1 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid vote value"})
	}

	currentVote, _ := h.repo.GetUserVote(user.ID, cardID)
	newValue := input.Value
	if currentVote == input.Value {
		newValue = 0
	}

	if err := h.repo.Vote(user.ID, cardID, newValue); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error voting"})
	}

	card, err := h.repo.GetCard(cardID)
	if err != nil || card == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Card not found"})
	}
	card.UserVote = newValue

	return c.JSON(card)
}

// GetComments returns comments for a card as JSON
func (h *Handler) GetComments(c *fiber.Ctx) error {
	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	comments, err := h.repo.GetComments(cardID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error loading comments"})
	}
	return c.JSON(comments)
}

// APICreateComment creates a comment and returns JSON
func (h *Handler) APICreateComment(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)

	var input struct {
		Content string   `json:"content"`
		Images  []string `json:"images"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	content := strings.TrimSpace(input.Content)
	if content == "" && len(input.Images) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Comment cannot be empty"})
	}

	comment := &models.Comment{
		CardID:    cardID,
		UserID:    user.ID,
		Content:   content,
		Images:    input.Images,
		CreatedAt: time.Now(),
		Author:    user,
	}

	if err := h.repo.CreateComment(comment); err != nil {
		log.Printf("Error creating comment: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Error creating comment"})
	}

	// Send notification to card author (if not commenting on own card)
	go h.notifyNewComment(cardID, user, comment)

	return c.Status(201).JSON(comment)
}

func (h *Handler) notifyNewComment(cardID int64, commenter *models.User, comment *models.Comment) {
	card, err := h.repo.GetCard(cardID)
	if err != nil || card == nil {
		return
	}

	// Don't notify if user comments on their own card
	if card.UserID == commenter.ID {
		return
	}

	var link string
	if h.cfg.AppURL != "" {
		link = fmt.Sprintf("\n\n<a href=\"%s/c/%d\">Открыть карточку</a>", h.cfg.AppURL, card.ID)
	}

	commenterName := commenter.FirstName
	if commenter.LastName != "" {
		commenterName += " " + commenter.LastName
	}

	// Truncate long comments
	content := comment.Content
	if len(content) > 200 {
		content = content[:200] + "..."
	}

	message := fmt.Sprintf("💬 <b>Новый комментарий к вашей карточке</b>\n\n\"%s\"\n\n<b>%s</b>: %s%s",
		card.Title, commenterName, content, link)

	if err := h.telegram.SendMessage(card.UserID, message); err != nil {
		log.Printf("Failed to send comment notification to user %d: %v", card.UserID, err)
	}
}

// APITelegramAuth handles Telegram auth for JSON API
func (h *Handler) APITelegramAuth(c *fiber.Ctx) error {
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
		Secure:   false, // Set to true in production with HTTPS
		SameSite: "Lax",
	})

	return c.JSON(fiber.Map{"ok": true})
}

// APIUploadFile handles file upload to S3
func (h *Handler) APIUploadFile(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file provided"})
	}

	if file.Size > 100*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "File too large (max 100MB)"})
	}

	if h.s3 == nil {
		return c.Status(500).JSON(fiber.Map{"error": "File storage not configured"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read file"})
	}
	defer f.Close()

	contentType := file.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = s3client.DetectContentType(file.Filename)
	}

	result, err := h.s3.Upload(c.Context(), f, file.Filename, contentType, file.Size)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to upload file: " + err.Error()})
	}

	return c.JSON(result)
}

// APIUploadImage handles image upload to ImgBB (legacy, kept for backward compatibility)
func (h *Handler) APIUploadImage(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No image provided"})
	}

	if file.Size > 32*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"error": "Image too large (max 32MB)"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read file"})
	}
	defer f.Close()

	imageData := make([]byte, file.Size)
	if _, err := f.Read(imageData); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read file data"})
	}

	url, err := h.imgbb.Upload(imageData)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to upload image: " + err.Error()})
	}

	return c.JSON(fiber.Map{"url": url})
}

// Admin endpoints

// APIDeleteCard deletes a card (admin only)
func (h *Handler) APIDeleteCard(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	if !h.cfg.IsAdmin(user.ID) {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	if err := h.repo.DeleteCard(cardID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete card"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// APIDeleteComment deletes a comment (admin only)
func (h *Handler) APIDeleteComment(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	if !h.cfg.IsAdmin(user.ID) {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	commentID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	if err := h.repo.DeleteComment(commentID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete comment"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// APIUpdateCardStatus updates card status (admin only)
func (h *Handler) APIUpdateCardStatus(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Login required"})
	}

	if !h.cfg.IsAdmin(user.ID) {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	cardID, _ := strconv.ParseInt(c.Params("id"), 10, 64)

	var input struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	validStatuses := map[string]bool{"open": true, "closed": true, "fixed": true, "fix_coming": true}
	if !validStatuses[input.Status] {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid status"})
	}

	if err := h.repo.UpdateCardStatus(cardID, input.Status); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
	}

	card, err := h.repo.GetCard(cardID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get card"})
	}

	// Send notification to card author
	go h.notifyStatusChange(card, input.Status)

	return c.JSON(card)
}

func (h *Handler) notifyStatusChange(card *models.Card, newStatus string) {
	if card == nil || card.UserID == 0 {
		return
	}

	statusLabels := map[string]string{
		"open":       "Open",
		"closed":     "Closed",
		"fixed":      "Fixed",
		"fix_coming": "Fix Coming",
	}

	statusLabel := statusLabels[newStatus]
	if statusLabel == "" {
		statusLabel = newStatus
	}

	var link string
	if h.cfg.AppURL != "" {
		link = fmt.Sprintf("\n\n<a href=\"%s/c/%d\">Открыть карточку</a>", h.cfg.AppURL, card.ID)
	}

	message := fmt.Sprintf("📋 <b>Статус вашей карточки изменен</b>\n\n\"%s\"\n\nНовый статус: <b>%s</b>%s",
		card.Title, statusLabel, link)

	if err := h.telegram.SendMessage(card.UserID, message); err != nil {
		log.Printf("Failed to send status notification to user %d: %v", card.UserID, err)
	}
}
