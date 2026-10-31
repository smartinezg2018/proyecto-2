ALTER TABLE project_quotes
  ADD COLUMN conditions TEXT NULL AFTER scope,
  ADD COLUMN delivery_days INT UNSIGNED NULL AFTER conditions;

ALTER TABLE projects
  ADD COLUMN selected_quote_id BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN selection_justification TEXT NULL AFTER selected_quote_id,
  ADD KEY idx_projects_selected_quote (selected_quote_id),
  ADD CONSTRAINT fk_projects_selected_quote
    FOREIGN KEY (selected_quote_id) REFERENCES project_quotes (id);
