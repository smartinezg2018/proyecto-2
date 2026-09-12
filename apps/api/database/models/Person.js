import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Person = sequelize.define(
  'Person',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    identification: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    phone: DataTypes.STRING(30),
    email: DataTypes.STRING(150),
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'persons'
  }
);
