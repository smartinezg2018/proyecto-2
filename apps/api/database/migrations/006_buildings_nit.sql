ALTER TABLE buildings
  CHANGE COLUMN identification nit VARCHAR(50) NOT NULL;

ALTER TABLE buildings
  RENAME INDEX uq_buildings_identification TO uq_buildings_nit;
