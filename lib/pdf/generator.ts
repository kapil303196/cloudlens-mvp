/**
 * CloudSave AI — PDF Generation Logic
 * Orchestrates React-PDF rendering into a downloadable buffer.
 * @module lib/pdf/generator
 */

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import type { AnalysisReport, PDFReportData } from '../types';

/**
 * Generates a PDF buffer from an AnalysisReport.
 * Dynamically imports ReportPDF to avoid SSR issues with @react-pdf/renderer.
 * @param report - Complete analysis report
 * @returns Buffer containing the PDF bytes
 */
export async function generatePDFBuffer(report: AnalysisReport): Promise<Buffer> {
  // Dynamic import to prevent SSR issues
  const { ReportPDF } = await import('../../components/report/ReportPDF');

  const data: PDFReportData = {
    report,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
  };

  const element = React.createElement(ReportPDF, { data });
  const buffer = await renderToBuffer(element);

  return Buffer.from(buffer);
}
