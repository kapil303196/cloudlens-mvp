/**
 * CloudSave AI — Sanity Analysis Report Schema
 * Defines the document structure for storing analysis reports.
 * @module lib/sanity/schemas/analysisReport
 */

import type { SchemaTypeDefinition } from 'sanity';

const analysisReportSchema: SchemaTypeDefinition = {
  name: 'analysisReport',
  title: 'Analysis Report',
  type: 'document',
  fields: [
    {
      name: 'reportId',
      type: 'string',
      title: 'Report ID',
      description: 'Unique identifier for this report (e.g., rpt_abc123)',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'inputFileName',
      type: 'string',
      title: 'Input File Name',
      description: 'Name of the uploaded infrastructure file',
    },
    {
      name: 'inputFileType',
      type: 'string',
      title: 'File Type',
      description: 'Detected file type: cdk | terraform | cloudformation | ecs-task | zip | image',
      options: {
        list: [
          { title: 'AWS CDK', value: 'cdk' },
          { title: 'Terraform', value: 'terraform' },
          { title: 'CloudFormation', value: 'cloudformation' },
          { title: 'ECS Task Definition', value: 'ecs-task' },
          { title: 'ZIP Archive', value: 'zip' },
          { title: 'Architecture Image', value: 'image' },
        ],
      },
    },
    {
      name: 'infraSummary',
      type: 'text',
      title: 'Infrastructure Summary (JSON)',
      description: 'JSON string of the NormalizedInfra object',
      rows: 6,
    },
    {
      name: 'detectedServices',
      type: 'array',
      title: 'Detected AWS Services',
      of: [{ type: 'string' }],
    },
    {
      name: 'issuesDetected',
      type: 'text',
      title: 'Issues Detected (JSON)',
      description: 'JSON string of DetectedIssue[]',
      rows: 6,
    },
    {
      name: 'totalCurrentCost',
      type: 'number',
      title: 'Current Monthly Cost (USD)',
    },
    {
      name: 'totalOptimizedCost',
      type: 'number',
      title: 'Optimized Monthly Cost (USD)',
    },
    {
      name: 'totalSavings',
      type: 'number',
      title: 'Total Monthly Savings (USD)',
    },
    {
      name: 'savingPercent',
      type: 'number',
      title: 'Saving Percentage',
    },
    {
      name: 'aiExplanations',
      type: 'text',
      title: 'AI Explanations (JSON)',
      description: 'JSON string of AIExplanation[]',
      rows: 6,
    },
    {
      name: 'createdAt',
      type: 'datetime',
      title: 'Created At',
    },
  ],
  preview: {
    select: {
      title: 'reportId',
      subtitle: 'inputFileName',
    },
    prepare({ title, subtitle }: { title: string; subtitle: string }) {
      return {
        title: `Report: ${title}`,
        subtitle: subtitle ?? 'No file name',
      };
    },
  },
};

export default analysisReportSchema;
