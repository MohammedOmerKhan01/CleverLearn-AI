-- =============================================================================
-- Migration 002: Add is_published to subjects, is_active to users
-- Run this against an existing DB that was created before schema v2.
-- Safe to run multiple times (uses IF NOT EXISTS / IGNORE).
-- =============================================================================

-- Add is_active to users if missing
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role;

-- Add is_published to subjects if missing
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE AFTER thumbnail_url;

-- Add updated_at to sections if missing
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add updated_at to videos if missing
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add created_at to video_progress if missing
ALTER TABLE video_progress
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER completed_at;

-- Add UNIQUE constraint on refresh_tokens.token_hash if missing
-- (wrapped in a procedure to avoid error if already exists)
DROP PROCEDURE IF EXISTS add_unique_token_hash;
DELIMITER $$
CREATE PROCEDURE add_unique_token_hash()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'refresh_tokens'
      AND CONSTRAINT_NAME = 'uq_refresh_token_hash'
  ) THEN
    ALTER TABLE refresh_tokens ADD UNIQUE KEY uq_refresh_token_hash (token_hash);
  END IF;
END$$
DELIMITER ;
CALL add_unique_token_hash();
DROP PROCEDURE IF EXISTS add_unique_token_hash;
