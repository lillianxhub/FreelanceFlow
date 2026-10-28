-- Existing accounts remain eligible; only an explicit request starts their trial.
ALTER TABLE users ADD COLUMN premium_trial_ends_at TIMESTAMP WITH TIME ZONE;
