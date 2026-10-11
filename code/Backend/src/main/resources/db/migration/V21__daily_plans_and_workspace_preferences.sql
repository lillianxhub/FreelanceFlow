CREATE TABLE daily_plans (
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (owner_id, plan_date)
);
CREATE TABLE daily_plan_items (
    owner_id UUID NOT NULL,
    plan_date DATE NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks(id),
    position INTEGER NOT NULL,
    PRIMARY KEY (owner_id, plan_date, task_id),
    UNIQUE (owner_id, plan_date, position),
    FOREIGN KEY (owner_id, plan_date) REFERENCES daily_plans(owner_id, plan_date) ON DELETE CASCADE
);
CREATE TABLE workspace_preferences (
    owner_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    board_timer_mode VARCHAR(10) NOT NULL DEFAULT 'AUTO' CHECK (board_timer_mode IN ('AUTO', 'MANUAL'))
);
CREATE INDEX idx_daily_plan_items_task ON daily_plan_items(task_id);
