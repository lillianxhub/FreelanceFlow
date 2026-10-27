-- Global entitlement policy; account plans and existing finance data stay intact.
CREATE TABLE app_feature_settings (
 id SMALLINT PRIMARY KEY CHECK (id = 1),
 premium_enforced BOOLEAN NOT NULL DEFAULT FALSE,
 version BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO app_feature_settings(id, premium_enforced) VALUES (1, FALSE);
