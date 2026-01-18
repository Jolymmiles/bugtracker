package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	BotToken    string
	BotUsername string
	DatabaseURL string
	SessionKey  string
	ImgBBApiKey string
	AdminIDs    []int64
	AppURL      string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:        getEnv("PORT", "8080"),
		BotToken:    getEnv("BOT_TOKEN", ""),
		BotUsername: getEnv("BOT_USERNAME", "YourBotName"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://bugtracker:bugtracker@localhost:5432/bugtracker?sslmode=disable"),
		SessionKey:  getEnv("SESSION_KEY", "change-me-in-production"),
		ImgBBApiKey: getEnv("IMGBB_API_KEY", ""),
		AdminIDs:    parseAdminIDs(getEnv("ADMIN_IDS", "")),
		AppURL:      getEnv("APP_URL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseAdminIDs(s string) []int64 {
	var ids []int64
	for _, part := range strings.Split(s, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if id, err := strconv.ParseInt(part, 10, 64); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

func (c *Config) IsAdmin(userID int64) bool {
	for _, id := range c.AdminIDs {
		if id == userID {
			return true
		}
	}
	return false
}
