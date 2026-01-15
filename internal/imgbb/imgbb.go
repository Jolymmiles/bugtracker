package imgbb

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
)

const apiURL = "https://api.imgbb.com/1/upload"

type Client struct {
	apiKey string
}

type uploadResponse struct {
	Data struct {
		URL       string `json:"url"`
		DisplayURL string `json:"display_url"`
		DeleteURL string `json:"delete_url"`
	} `json:"data"`
	Success bool   `json:"success"`
	Status  int    `json:"status"`
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey}
}

func (c *Client) Upload(imageData []byte) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("imgbb api key not configured")
	}

	encoded := base64.StdEncoding.EncodeToString(imageData)

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	if err := writer.WriteField("key", c.apiKey); err != nil {
		return "", fmt.Errorf("failed to write key field: %w", err)
	}

	if err := writer.WriteField("image", encoded); err != nil {
		return "", fmt.Errorf("failed to write image field: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %w", err)
	}

	req, err := http.NewRequest("POST", apiURL, &buf)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload image: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result uploadResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if !result.Success {
		return "", fmt.Errorf("imgbb upload failed with status %d", result.Status)
	}

	return result.Data.URL, nil
}

func (c *Client) UploadBase64(base64Image string) (string, error) {
	imageData, err := base64.StdEncoding.DecodeString(base64Image)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}
	return c.Upload(imageData)
}
