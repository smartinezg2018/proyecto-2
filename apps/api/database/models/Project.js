import { DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';

export const Project = sequelize.define(
  'Project',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    buildingId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    objective: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    projectType: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    budget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    responsible: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    approvalReference: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'aprobado'
    },
    selectedQuoteId: DataTypes.BIGINT.UNSIGNED,
    selectionJustification: DataTypes.TEXT,
    closeDate: DataTypes.DATEONLY,
    totalCost: DataTypes.DECIMAL(15, 2),
    result: DataTypes.TEXT,
    closingDocumentRef: { type: DataTypes.STRING(255), field: 'closing_document_ref' },
    createdBy: DataTypes.BIGINT.UNSIGNED,
    updatedBy: DataTypes.BIGINT.UNSIGNED
  },
  {
    tableName: 'projects'
  }
);
