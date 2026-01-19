package s3

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

const MaxFileSize = 100 * 1024 * 1024 // 100MB

type Client struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

type UploadResult struct {
	URL      string `json:"url"`
	Type     string `json:"type"`
	Filename string `json:"filename"`
}

func New(bucket, region, endpoint, accessKeyID, secretAccessKey, publicURL string) (*Client, error) {
	if bucket == "" {
		return nil, fmt.Errorf("S3 bucket not configured")
	}

	ctx := context.Background()

	var cfg aws.Config
	var err error

	if accessKeyID != "" && secretAccessKey != "" {
		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(region),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
		)
	} else {
		cfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(region))
	}

	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	var client *s3.Client
	if endpoint != "" {
		client = s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(endpoint)
			o.UsePathStyle = true
		})
	} else {
		client = s3.NewFromConfig(cfg)
	}

	return &Client{
		client:    client,
		bucket:    bucket,
		publicURL: publicURL,
	}, nil
}

func (c *Client) Upload(ctx context.Context, file io.Reader, filename string, contentType string, size int64) (*UploadResult, error) {
	if size > MaxFileSize {
		return nil, fmt.Errorf("file size exceeds maximum allowed size of 100MB")
	}

	ext := filepath.Ext(filename)
	key := fmt.Sprintf("%s/%s%s", time.Now().Format("2006/01/02"), uuid.New().String(), ext)

	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(key),
		Body:          file,
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(size),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	url := c.GenerateURL(key)
	fileType := c.DetectFileType(contentType)

	return &UploadResult{
		URL:      url,
		Type:     fileType,
		Filename: filename,
	}, nil
}

func (c *Client) GenerateURL(key string) string {
	if c.publicURL != "" {
		return fmt.Sprintf("%s/%s", strings.TrimSuffix(c.publicURL, "/"), key)
	}
	return fmt.Sprintf("https://%s.s3.amazonaws.com/%s", c.bucket, key)
}

func (c *Client) DetectFileType(contentType string) string {
	if strings.HasPrefix(contentType, "image/") {
		return "image"
	}
	if strings.HasPrefix(contentType, "video/") {
		return "video"
	}
	return "file"
}

func DetectContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".mov":
		return "video/quicktime"
	case ".avi":
		return "video/x-msvideo"
	case ".mkv":
		return "video/x-matroska"
	case ".pdf":
		return "application/pdf"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case ".xls":
		return "application/vnd.ms-excel"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".zip":
		return "application/zip"
	case ".rar":
		return "application/vnd.rar"
	case ".txt":
		return "text/plain"
	default:
		return "application/octet-stream"
	}
}
