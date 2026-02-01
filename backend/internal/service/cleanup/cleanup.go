package cleanup

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Service handles cleanup of orphaned jobs and temp files
type Service struct {
	jobRepo         JobRepository
	logger          *slog.Logger
	tempDir         string
	maxJobAge       time.Duration
	cleanupInterval time.Duration
}

// JobRepository interface for job cleanup operations
type JobRepository interface {
	MarkStuckJobsAsFailed(ctx context.Context, maxDuration time.Duration) (int, error)
}

// Config holds configuration for the cleanup service
type Config struct {
	TempDir         string        // Directory where temp files are stored
	MaxJobAge       time.Duration // Maximum time a job can be in processing state
	CleanupInterval time.Duration // How often to run cleanup
}

// NewService creates a new cleanup service
func NewService(jobRepo JobRepository, logger *slog.Logger, cfg Config) *Service {
	if cfg.TempDir == "" {
		cfg.TempDir = os.TempDir()
	}
	if cfg.MaxJobAge == 0 {
		cfg.MaxJobAge = 35 * time.Minute
	}
	if cfg.CleanupInterval == 0 {
		cfg.CleanupInterval = 5 * time.Minute
	}

	return &Service{
		jobRepo:         jobRepo,
		logger:          logger,
		tempDir:         cfg.TempDir,
		maxJobAge:       cfg.MaxJobAge,
		cleanupInterval: cfg.CleanupInterval,
	}
}

// Start begins the cleanup worker in the background
func (s *Service) Start(ctx context.Context) {
	s.logger.Info("Starting cleanup service",
		"temp_dir", s.tempDir,
		"max_job_age", s.maxJobAge,
		"cleanup_interval", s.cleanupInterval,
	)

	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	// Run cleanup immediately on start
	s.runCleanup(ctx)

	for {
		select {
		case <-ticker.C:
			s.runCleanup(ctx)
		case <-ctx.Done():
			s.logger.Info("Cleanup service stopping")
			return
		}
	}
}

// runCleanup performs both job cleanup and temp file cleanup
func (s *Service) runCleanup(ctx context.Context) {
	// Clean up stuck jobs
	jobsFixed, err := s.cleanupStuckJobs(ctx)
	if err != nil {
		s.logger.Error("Failed to cleanup stuck jobs", "error", err)
	} else if jobsFixed > 0 {
		s.logger.Info("Cleaned up stuck jobs", "count", jobsFixed)
	}

	// Clean up orphaned temp files
	filesDeleted, err := s.cleanupTempFiles(ctx)
	if err != nil {
		s.logger.Error("Failed to cleanup temp files", "error", err)
	} else if filesDeleted > 0 {
		s.logger.Info("Cleaned up temp files", "count", filesDeleted)
	}
}

// cleanupStuckJobs finds and marks stuck jobs as failed
func (s *Service) cleanupStuckJobs(ctx context.Context) (int, error) {
	count, err := s.jobRepo.MarkStuckJobsAsFailed(ctx, s.maxJobAge)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// cleanupTempFiles removes orphaned temporary video and thumbnail files
func (s *Service) cleanupTempFiles(ctx context.Context) (int, error) {
	var deletedCount int

	// Look for video and thumbnail files in temp directory
	// Pattern: dishflow-video-*, dishflow-thumb-*
	patterns := []string{"dishflow-video-*", "dishflow-thumb-*"}

	for _, pattern := range patterns {
		matches, err := filepath.Glob(filepath.Join(s.tempDir, pattern))
		if err != nil {
			s.logger.Warn("Failed to glob temp files", "pattern", pattern, "error", err)
			continue
		}

		for _, path := range matches {
			// Check if context is cancelled
			select {
			case <-ctx.Done():
				return deletedCount, ctx.Err()
			default:
			}

			// Only delete files older than twice the max job age (safety margin)
			info, err := os.Stat(path)
			if err != nil {
				continue // File might have been deleted already
			}

			age := time.Since(info.ModTime())
			if age > (s.maxJobAge * 2) {
				if err := os.Remove(path); err != nil {
					s.logger.Warn("Failed to delete temp file", "path", path, "error", err)
				} else {
					deletedCount++
					s.logger.Debug("Deleted orphaned temp file", "path", path, "age", age)
				}
			}
		}
	}

	return deletedCount, nil
}

// CleanupVideoDownload is a helper function that can be called to clean up a specific video download
// This should be called by the video handler after processing is complete or on error
func CleanupVideoDownload(path string, logger *slog.Logger) {
	if path == "" {
		return
	}

	// Only delete if it's in temp directory and matches expected pattern
	if !strings.Contains(path, os.TempDir()) {
		logger.Warn("Refusing to delete file outside temp directory", "path", path)
		return

	}

	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		logger.Warn("Failed to cleanup video file", "path", path, "error", err)
	}
}
