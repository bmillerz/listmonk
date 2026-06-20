-- name: get-dashboard-charts
SELECT data FROM mat_dashboard_charts;

-- name: get-dashboard-counts
SELECT data FROM mat_dashboard_counts;

-- name: get-dashboard-insights
-- BRAND: live (non-materialized) dashboard extras. 30-day growth for subscribers
-- (net new vs. the base 30 days ago) and messages sent (last 30d vs. prior 30d),
-- plus a monthly bounce rate (bounces / sent, keyed to each campaign's send month)
-- for the last 12 months. Complaints are excluded from the bounce count.
WITH sub_growth AS (
    SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last30,
        COUNT(*) FILTER (WHERE created_at <  NOW() - INTERVAL '30 days') AS base
    FROM subscribers
),
msg_growth AS (
    SELECT
        COALESCE(SUM(sent) FILTER (WHERE started_at >= NOW() - INTERVAL '30 days'), 0) AS last30,
        COALESCE(SUM(sent) FILTER (WHERE started_at >= NOW() - INTERVAL '60 days'
                                     AND started_at <  NOW() - INTERVAL '30 days'), 0) AS prev30
    FROM campaigns
    WHERE status = 'finished'
),
camp_bounces AS (
    SELECT campaign_id, COUNT(*) AS bounces FROM bounces WHERE type != 'complaint' GROUP BY campaign_id
),
bounce_monthly AS (
    SELECT
        DATE_TRUNC('month', c.started_at) AS month,
        SUM(c.sent)                       AS sent,
        COALESCE(SUM(cb.bounces), 0)      AS bounces
    FROM campaigns c
        LEFT JOIN camp_bounces cb ON cb.campaign_id = c.id
    WHERE c.status = 'finished' AND c.started_at >= NOW() - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY 1
),
-- BRAND: account-level email performance for the current vs. prior 30-day window
-- (campaigns finished in each window), so the dashboard KPI cards can show rates
-- and their 30-day change. Opens/clicks counted as unique subscribers per campaign.
cw AS (
    SELECT c.id, c.sent,
        CASE WHEN c.started_at >= NOW() - INTERVAL '30 days' THEN 'current' ELSE 'prior' END AS period
    FROM campaigns c
    WHERE c.status = 'finished' AND c.started_at >= NOW() - INTERVAL '60 days'
),
ev_opens  AS (SELECT campaign_id, COUNT(DISTINCT subscriber_id) AS n FROM campaign_views GROUP BY 1),
ev_clicks AS (SELECT campaign_id, COUNT(DISTINCT subscriber_id) AS n FROM link_clicks GROUP BY 1),
ev_unsubs AS (SELECT campaign_id, COUNT(*) AS n FROM campaign_unsubscribes GROUP BY 1),
email_window AS (
    SELECT cw.period,
        SUM(cw.sent)                 AS sends,
        COALESCE(SUM(cb.bounces), 0) AS bounces,
        COALESCE(SUM(eo.n), 0)       AS opens,
        COALESCE(SUM(ec.n), 0)       AS clicks,
        COALESCE(SUM(eu.n), 0)       AS unsubs
    FROM cw
        LEFT JOIN camp_bounces cb ON cb.campaign_id = cw.id
        LEFT JOIN ev_opens  eo ON eo.campaign_id = cw.id
        LEFT JOIN ev_clicks ec ON ec.campaign_id = cw.id
        LEFT JOIN ev_unsubs eu ON eu.campaign_id = cw.id
    GROUP BY cw.period
)
SELECT JSON_BUILD_OBJECT(
    'subscriberGrowth', (SELECT ROW_TO_JSON(sub_growth) FROM sub_growth),
    'messageGrowth',    (SELECT ROW_TO_JSON(msg_growth) FROM msg_growth),
    'bounceRates',      (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                                'month', month, 'sent', sent, 'bounces', bounces)), '[]'::json)
                         FROM bounce_monthly),
    'emailMetrics',     JSON_BUILD_OBJECT(
        'current', (SELECT ROW_TO_JSON(t) FROM (SELECT sends, bounces, opens, clicks, unsubs FROM email_window WHERE period = 'current') t),
        'prior',   (SELECT ROW_TO_JSON(t) FROM (SELECT sends, bounces, opens, clicks, unsubs FROM email_window WHERE period = 'prior') t)
    )
) AS data;

-- name: get-settings
SELECT JSON_OBJECT_AGG(key, value) AS settings FROM (SELECT * FROM settings ORDER BY key) t;

-- name: update-settings
UPDATE settings AS s SET value = c.value
    -- For each key in the incoming JSON map, update the row with the key and its value.
    FROM(SELECT * FROM JSONB_EACH($1)) AS c(key, value) WHERE s.key = c.key;

-- name: update-settings-by-key
UPDATE settings SET value = $2, updated_at = NOW() WHERE key = $1;

-- name: get-db-info
SELECT JSON_BUILD_OBJECT('version', (SELECT VERSION()),
                        'size_mb', (SELECT ROUND(pg_database_size((SELECT CURRENT_DATABASE()))/(1024^2)))) AS info;
