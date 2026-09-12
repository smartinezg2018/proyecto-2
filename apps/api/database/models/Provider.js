import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Provider = sequelize.define(
  'Provider',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    contactName: DataTypes.STRING(150),
    email: DataTypes.STRING(150),
    phone: DataTypes.STRING(40),
    address: DataTypes.STRING(255),
    createdBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'providers'
  }
);
