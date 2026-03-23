-- =============================================================================
-- LMS Database Schema  (production-ready, UTF-8, UUID PKs)
-- Engine: MySQL 8.0+
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)                  NOT NULL,
  name          VARCHAR(255)                 NOT NULL,
  email         VARCHAR(255)                 NOT NULL,
  password_hash VARCHAR(255)                 NOT NULL,
  role          ENUM('student','admin')      NOT NULL DEFAULT 'student',
  is_active     BOOLEAN                      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP                    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_users_email        (email),
  INDEX         idx_users_role        (role),
  INDEX         idx_users_is_active   (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- subjects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id            VARCHAR(36)   NOT NULL,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  thumbnail_url VARCHAR(500),
  is_published  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_subjects_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- sections
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id          VARCHAR(36)  NOT NULL,
  subject_id  VARCHAR(36)  NOT NULL,
  title       VARCHAR(255) NOT NULL,
  order_index INT          NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_section_order      (subject_id, order_index),
  INDEX       idx_sections_subject  (subject_id),
  CONSTRAINT fk_sections_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- videos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id               VARCHAR(36)  NOT NULL,
  section_id       VARCHAR(36)  NOT NULL,
  title            VARCHAR(255) NOT NULL,
  youtube_id       VARCHAR(50)  NOT NULL,
  duration_seconds INT          NOT NULL DEFAULT 0,
  order_index      INT          NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_video_order      (section_id, order_index),
  INDEX       idx_videos_section  (section_id),
  INDEX       idx_videos_youtube  (youtube_id),
  CONSTRAINT fk_videos_section
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- enrollments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id          VARCHAR(36) NOT NULL,
  user_id     VARCHAR(36) NOT NULL,
  subject_id  VARCHAR(36) NOT NULL,
  enrolled_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_enrollment          (user_id, subject_id),
  INDEX       idx_enrollments_user   (user_id),
  INDEX       idx_enrollments_subject(subject_id),
  CONSTRAINT fk_enrollments_user
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- video_progress
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_progress (
  id              VARCHAR(36) NOT NULL,
  user_id         VARCHAR(36) NOT NULL,
  video_id        VARCHAR(36) NOT NULL,
  watched_seconds INT         NOT NULL DEFAULT 0,
  is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMP   NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_video_progress      (user_id, video_id),
  INDEX       idx_progress_user      (user_id),
  INDEX       idx_progress_video     (video_id),
  INDEX       idx_progress_completed (is_completed),
  CONSTRAINT fk_progress_user
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_progress_video
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- refresh_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         VARCHAR(36)  NOT NULL,
  user_id    VARCHAR(36)  NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_refresh_token_hash    (token_hash),
  INDEX       idx_refresh_tokens_user  (user_id),
  INDEX       idx_refresh_tokens_expiry(expires_at),
  INDEX       idx_refresh_tokens_valid (user_id, revoked, expires_at),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
