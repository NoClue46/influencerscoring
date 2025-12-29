-- Rename comment_rate to comment_er in posts table
ALTER TABLE posts RENAME COLUMN comment_rate TO comment_er;

-- Rename comment_rate to comment_er in reels_urls table
ALTER TABLE reels_urls RENAME COLUMN comment_rate TO comment_er;
