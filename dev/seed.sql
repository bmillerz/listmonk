-- Local-dev demo data for the analytics page. Safe to re-run after a DB wipe.
--   docker compose -f dev/local.yml exec -T db psql -U listmonk -d listmonk < dev/seed.sql
BEGIN;

-- Demo list.
INSERT INTO lists (uuid, name, type, optin, description)
VALUES (gen_random_uuid(), 'ITFT Newsletter (dev)', 'public', 'single', 'Demo list for local dev');

-- 180 demo subscribers.
INSERT INTO subscribers (uuid, email, name, status)
SELECT gen_random_uuid(), 'dev' || g || '@example.com', 'Dev Subscriber ' || g, 'enabled'
FROM generate_series(1, 180) g;

INSERT INTO subscriber_lists (subscriber_id, list_id, status)
SELECT s.id, (SELECT id FROM lists WHERE name = 'ITFT Newsletter (dev)'), 'confirmed'
FROM subscribers s WHERE s.email LIKE 'dev%@example.com';

-- Trackable links.
INSERT INTO links (uuid, url) VALUES
  (gen_random_uuid(), 'https://irelandtipsfortravellers.com/guide-to-dingle'),
  (gen_random_uuid(), 'https://irelandtipsfortravellers.com/best-traditional-pubs'),
  (gen_random_uuid(), 'https://irelandtipsfortravellers.com/car-hire-tips'),
  (gen_random_uuid(), 'https://irelandtipsfortravellers.com/wild-atlantic-way');

-- Two finished campaigns.
INSERT INTO campaigns (uuid, name, subject, from_email, body, content_type, status, type, messenger, sent, to_send, started_at, created_at)
VALUES
  (gen_random_uuid(), '2026-06 Monthly Newsletter', 'Your June guide to hidden Ireland', 'hello@irelandtipsfortravellers.com', '<p>Hello, traveller!</p>', 'richtext', 'finished', 'regular', 'email', 180, 180, now() - interval '2 days', now() - interval '3 days'),
  (gen_random_uuid(), 'Welcome Series: Email 1', 'Welcome to Ireland Tips for Travellers', 'hello@irelandtipsfortravellers.com', '<p>Welcome!</p>', 'richtext', 'finished', 'regular', 'email', 120, 120, now() - interval '5 days', now() - interval '6 days');

INSERT INTO campaign_lists (campaign_id, list_id, list_name)
SELECT c.id, l.id, l.name FROM campaigns c, lists l
WHERE l.name = 'ITFT Newsletter (dev)' AND c.name IN ('2026-06 Monthly Newsletter', 'Welcome Series: Email 1');

-- Helper expressions reused below.
-- Campaign 1 — 115 opens, 42 clicks, 5 bounces, 7 unsubscribes, spread over 10h.
INSERT INTO campaign_views (campaign_id, subscriber_id, created_at)
SELECT (SELECT id FROM campaigns WHERE name = '2026-06 Monthly Newsletter'), s.id,
       (now() - interval '2 days') + (random() * interval '10 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id LIMIT 115) s;

INSERT INTO link_clicks (campaign_id, link_id, subscriber_id, created_at)
SELECT (SELECT id FROM campaigns WHERE name = '2026-06 Monthly Newsletter'),
       (SELECT min(id) FROM links) - 1 + (ARRAY[1, 1, 1, 2, 2, 3, 4])[1 + floor(random() * 7)::int],
       s.id, (now() - interval '2 days') + (random() * interval '10 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id LIMIT 42) s;

INSERT INTO bounces (subscriber_id, campaign_id, type, source, created_at)
SELECT s.id, (SELECT id FROM campaigns WHERE name = '2026-06 Monthly Newsletter'), 'hard', 'demo',
       (now() - interval '2 days') + (random() * interval '2 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id DESC LIMIT 5) s;

INSERT INTO campaign_unsubscribes (campaign_id, subscriber_id, created_at)
SELECT (SELECT id FROM campaigns WHERE name = '2026-06 Monthly Newsletter'), s.id,
       (now() - interval '2 days') + (random() * interval '10 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id DESC OFFSET 10 LIMIT 7) s;

-- Campaign 2 — lighter engagement, for the multi-campaign comparison view.
INSERT INTO campaign_views (campaign_id, subscriber_id, created_at)
SELECT (SELECT id FROM campaigns WHERE name = 'Welcome Series: Email 1'), s.id,
       (now() - interval '5 days') + (random() * interval '8 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id LIMIT 60) s;

INSERT INTO link_clicks (campaign_id, link_id, subscriber_id, created_at)
SELECT (SELECT id FROM campaigns WHERE name = 'Welcome Series: Email 1'),
       (SELECT min(id) FROM links) - 1 + (ARRAY[1, 1, 2, 3, 4])[1 + floor(random() * 5)::int],
       s.id, (now() - interval '5 days') + (random() * interval '8 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id LIMIT 18) s;

INSERT INTO bounces (subscriber_id, campaign_id, type, source, created_at)
SELECT s.id, (SELECT id FROM campaigns WHERE name = 'Welcome Series: Email 1'), 'soft', 'demo',
       (now() - interval '5 days') + (random() * interval '2 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id DESC LIMIT 3) s;

INSERT INTO campaign_unsubscribes (campaign_id, subscriber_id, created_at)
SELECT (SELECT id FROM campaigns WHERE name = 'Welcome Series: Email 1'), s.id,
       (now() - interval '5 days') + (random() * interval '8 hours')
FROM (SELECT id FROM subscribers WHERE email LIKE 'dev%@example.com' ORDER BY id DESC OFFSET 20 LIMIT 4) s;

COMMIT;
