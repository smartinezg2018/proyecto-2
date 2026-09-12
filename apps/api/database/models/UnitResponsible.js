import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const UnitResponsible = sequelize.define(
  'UnitResponsible',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    unitId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true
    },
    personId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'unit_responsibles',
    updatedAt: false
  }
);
