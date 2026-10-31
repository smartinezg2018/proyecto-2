ALTER TABLE project_progress
  ADD COLUMN quote_id BIGINT UNSIGNED NULL,
  ADD COLUMN supplier_id BIGINT UNSIGNED NULL,
  ADD COLUMN supplier_name VARCHAR(150) NULL;

ALTER TABLE project_progress
  ADD KEY idx_project_progress_quote (quote_id),
  ADD CONSTRAINT fk_project_progress_quote FOREIGN KEY (quote_id) REFERENCES project_quotes (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_project_progress_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL;

UPDATE project_progress pp
INNER JOIN projects p ON p.id = pp.project_id
INNER JOIN project_quotes pq ON pq.id = p.selected_quote_id
INNER JOIN suppliers s ON s.id = pq.supplier_id
SET
  pp.quote_id = pq.id,
  pp.supplier_id = s.id,
  pp.supplier_name = s.name
WHERE pp.quote_id IS NULL;
