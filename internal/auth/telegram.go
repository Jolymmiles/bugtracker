package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"bugtracker/internal/models"
)

const authValidDuration = 24 * time.Hour

func VerifyTelegramAuth(data models.TelegramAuthData, botToken string) bool {
	if data.Hash == "" || data.ID == 0 {
		return false
	}

	authTime := time.Unix(data.AuthDate, 0)
	if time.Since(authTime) > authValidDuration {
		return false
	}

	dataCheckString := buildDataCheckString(data)
	secretKey := sha256.Sum256([]byte(botToken))
	h := hmac.New(sha256.New, secretKey[:])
	h.Write([]byte(dataCheckString))
	calculatedHash := hex.EncodeToString(h.Sum(nil))

	return hmac.Equal([]byte(calculatedHash), []byte(data.Hash))
}

func buildDataCheckString(data models.TelegramAuthData) string {
	pairs := make(map[string]string)

	pairs["id"] = strconv.FormatInt(data.ID, 10)
	pairs["auth_date"] = strconv.FormatInt(data.AuthDate, 10)

	if data.FirstName != "" {
		pairs["first_name"] = data.FirstName
	}
	if data.LastName != "" {
		pairs["last_name"] = data.LastName
	}
	if data.Username != "" {
		pairs["username"] = data.Username
	}
	if data.PhotoURL != "" {
		pairs["photo_url"] = data.PhotoURL
	}

	keys := make([]string, 0, len(pairs))
	for k := range pairs {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", k, pairs[k]))
	}

	return strings.Join(parts, "\n")
}
