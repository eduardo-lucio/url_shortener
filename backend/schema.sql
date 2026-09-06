CREATE TABLE IF NOT EXISTS url_storage (
   original_url TEXT NOT NULL,
   short_url VARCHAR(64) UNIQUE NOT NULL,
   click_amount INT NOT NULL DEFAULT 0,
   creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   expiration_date TIMESTAMPTZ NOT NULL
);