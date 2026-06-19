-- richer blog author byline: profile link + title/role
ALTER TABLE posts ADD COLUMN author_url TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN author_title TEXT NOT NULL DEFAULT '';
