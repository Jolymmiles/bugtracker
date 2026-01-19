package migrate

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func Run(db *sql.DB, migrationsPath string) error {
	log.Println("Running database migrations...")

	files, err := os.ReadDir(migrationsPath)
	if err != nil {
		return err
	}

	var sqlFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") {
			sqlFiles = append(sqlFiles, f.Name())
		}
	}
	sort.Strings(sqlFiles)

	for _, fileName := range sqlFiles {
		filePath := filepath.Join(migrationsPath, fileName)
		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("Failed to read migration %s: %v", fileName, err)
			return err
		}

		log.Printf("Applying migration: %s", fileName)
		if _, err := db.Exec(string(content)); err != nil {
			log.Printf("Migration %s failed: %v", fileName, err)
			return err
		}
	}

	log.Println("All migrations completed successfully")
	return nil
}
