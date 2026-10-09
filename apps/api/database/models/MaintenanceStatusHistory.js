import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const MaintenanceStatusHistory = sequelize.define(
  'MaintenanceStatusHistory',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    maintenanceId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    fromStatus: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    toStatus: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    changedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: 'maintenance_status_history',
    timestamps: false
  }
);
