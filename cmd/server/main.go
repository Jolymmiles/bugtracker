package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/lib/pq"

	"bugtracker/internal/config"
	"bugtracker/internal/handlers"
	"bugtracker/internal/repository"
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	repo := repository.New(db)
	h := handlers.New(repo, cfg)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			log.Printf("Error: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Internal Server Error"})
		},
	})

	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,http://localhost:3000",
		AllowCredentials: true,
	}))
	app.Use(h.AuthMiddleware)

	// JSON API routes
	api := app.Group("/api")
	api.Get("/config", h.GetConfig)
	api.Get("/auth/me", h.GetMe)
	api.Post("/auth/telegram", h.APITelegramAuth)
	api.Post("/auth/logout", h.APILogout)
	api.Get("/cards", h.GetCards)
	api.Get("/cards/:id", h.GetCard)
	api.Post("/cards", h.APICreateCard)
	api.Delete("/cards/:id", h.APIDeleteCard)
	api.Patch("/cards/:id/status", h.APIUpdateCardStatus)
	api.Post("/cards/:id/vote", h.APIVote)
	api.Get("/cards/:id/comments", h.GetComments)
	api.Post("/cards/:id/comments", h.APICreateComment)
	api.Delete("/comments/:id", h.APIDeleteComment)
	api.Post("/upload", h.APIUploadImage)

	// Serve React SPA from web/dist
	distPath := "./web/dist"
	if _, err := os.Stat(distPath); err == nil {
		app.Static("/", distPath)
		app.Static("/assets", distPath+"/assets")

		// SPA fallback - serve index.html for all non-API routes
		app.Get("/*", func(c *fiber.Ctx) error {
			return c.SendFile(distPath + "/index.html")
		})
	} else {
		log.Println("Warning: web/dist not found. Run 'npm run build' in frontend/ directory.")
		app.Get("/", func(c *fiber.Ctx) error {
			return c.SendString("Frontend not built. Run 'cd frontend && npm install && npm run build'")
		})
	}

	log.Printf("Server starting on http://localhost:%s", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}
