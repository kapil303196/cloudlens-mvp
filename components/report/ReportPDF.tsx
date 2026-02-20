/**
 * CloudSave AI — React-PDF Report Template
 * 7-page PDF document matching the exact specification layout.
 * Uses @react-pdf/renderer with Helvetica (no custom fonts).
 * @module components/report/ReportPDF
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { PDFReportData } from '../../lib/types';
import type { DetectedIssue } from '../../lib/types';
import { formatCurrency, formatPercent, formatShortDate } from '../../lib/utils/format';
import { BRAND_COLORS } from '../../lib/utils/constants';
import { buildOptimizationRoadmap } from '../../lib/engine/cost-calculator';

// ===== STYLES =====

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 10,
    color: '#1E293B',
  },
  // ---- Header/Footer ----
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#94A3B8' },
  // ---- Cover ----
  coverPage: {
    fontFamily: 'Helvetica',
    backgroundColor: '#0F172A',
    padding: 60,
    flex: 1,
    justifyContent: 'center',
  },
  coverBadge: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  coverBadgeText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  coverTitle: { fontSize: 32, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 8 },
  coverSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 40 },
  coverSavings: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: BRAND_COLORS.success, marginBottom: 4 },
  coverSavingsLabel: { fontSize: 14, color: '#64748B', marginBottom: 32 },
  coverMeta: { fontSize: 10, color: '#64748B', marginBottom: 6 },
  coverDivider: { height: 1, backgroundColor: '#1E293B', marginVertical: 24 },
  coverFooter: { fontSize: 9, color: '#475569' },
  // ---- Section headers ----
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_COLORS.primary,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLORS.primary,
  },
  // ---- Summary boxes ----
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryBox: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  summaryLabel: { fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E293B' },
  summaryValueGreen: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BRAND_COLORS.success },
  // ---- Tables ----
  table: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tableRowLast: { flexDirection: 'row', padding: 10 },
  tableRowTotal: { flexDirection: 'row', padding: 10, backgroundColor: '#F8FAFC', borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  tableCell: { flex: 1, fontSize: 9 },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableCellGreen: { flex: 1, fontSize: 9, color: BRAND_COLORS.success, fontFamily: 'Helvetica-Bold' },
  tableCellRed: { flex: 1, fontSize: 9, color: BRAND_COLORS.danger },
  tableHeaderText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#475569', flex: 1 },
  // ---- Issues ----
  issueBlock: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  issueTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E293B', flex: 1 },
  severityBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    color: '#FFFFFF',
  },
  issueBody: { padding: 12 },
  issueDesc: { fontSize: 9, color: '#475569', lineHeight: 1.5, marginBottom: 10 },
  issueConfigRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  issueConfigBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#F8FAFC',
  },
  issueConfigLabel: { fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 },
  issueConfigValue: { fontSize: 9, color: '#1E293B', fontFamily: 'Helvetica-Bold' },
  aiExplanation: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primary,
    paddingLeft: 10,
    backgroundColor: '#F8F7FF',
    padding: 10,
    borderRadius: 4,
  },
  aiLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND_COLORS.primary, marginBottom: 4 },
  aiText: { fontSize: 9, color: '#475569', lineHeight: 1.5 },
  // ---- Roadmap ----
  roadmapPhase: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  roadmapHeader: {
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roadmapTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E293B' },
  roadmapItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  roadmapItemText: { fontSize: 9, color: '#475569', flex: 1 },
  roadmapItemSaving: { fontSize: 9, color: BRAND_COLORS.success, fontFamily: 'Helvetica-Bold' },
});

// ===== HELPERS =====

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return BRAND_COLORS.danger;
    case 'high': return '#F97316';
    case 'medium': return BRAND_COLORS.warning;
    default: return '#3B82F6';
  }
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.footerText}>CloudSave AI — LogicSpark Technology LLP</Text>
      <Text style={styles.footerText}>Page {pageNum}</Text>
    </View>
  );
}

// ===== PDF PAGES =====

function CoverPage({ data }: { data: PDFReportData }) {
  const { report, generatedAt } = data;
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>COST ANALYSIS REPORT</Text>
      </View>

      <Text style={styles.coverTitle}>CloudSave AI</Text>
      <Text style={styles.coverSubtitle}>AWS Infrastructure Cost Optimization</Text>

      <Text style={styles.coverSavings}>{formatCurrency(report.costSummary.totalMonthlySaving)}</Text>
      <Text style={styles.coverSavingsLabel}>Monthly Savings Identified</Text>

      <View style={styles.coverDivider} />

      <Text style={styles.coverMeta}>Generated: {formatShortDate(generatedAt)}</Text>
      <Text style={styles.coverMeta}>Input File: {report.inputFileName}</Text>
      <Text style={styles.coverMeta}>File Type: {report.inputFileType.toUpperCase()}</Text>
      <Text style={styles.coverMeta}>Services Analyzed: {report.detectedServices.length}</Text>
      <Text style={styles.coverMeta}>Issues Found: {report.issues.length}</Text>

      <View style={styles.coverDivider} />
      <Text style={styles.coverFooter}>Powered by LogicSpark Technology LLP · CloudSave AI v{data.version}</Text>
      <Text style={[styles.coverFooter, { marginTop: 4 }]}>
        Estimates based on static analysis. Actual savings may vary.
      </Text>
    </Page>
  );
}

function ExecutiveSummaryPage({ data }: { data: PDFReportData }) {
  const { report } = data;
  const { costSummary } = report;
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Services Detected</Text>
          <Text style={styles.summaryValue}>{report.detectedServices.length}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Issues Found</Text>
          <Text style={[styles.summaryValue, { color: BRAND_COLORS.warning }]}>
            {report.issues.length}
          </Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Current Monthly Cost</Text>
          <Text style={styles.summaryValue}>{formatCurrency(costSummary.totalCurrentCost)}</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Optimized Monthly Cost</Text>
          <Text style={styles.summaryValueGreen}>{formatCurrency(costSummary.totalOptimizedCost)}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Monthly Savings</Text>
          <Text style={styles.summaryValueGreen}>{formatCurrency(costSummary.totalMonthlySaving)}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Annual Savings</Text>
          <Text style={styles.summaryValueGreen}>{formatCurrency(costSummary.totalAnnualSaving)}</Text>
        </View>
      </View>

      <View style={[styles.summaryBox, { alignSelf: 'flex-start', minWidth: 200 }]}>
        <Text style={styles.summaryLabel}>Saving Percentage</Text>
        <Text style={styles.summaryValueGreen}>{formatPercent(costSummary.savingPercent)}</Text>
      </View>

      <PageFooter pageNum={2} />
    </Page>
  );
}

function DetectedServicesPage({ data }: { data: PDFReportData }) {
  const { report } = data;
  const issuesByService = new Map<string, number>();
  report.issues.forEach((i) => {
    issuesByService.set(i.service, (issuesByService.get(i.service) ?? 0) + 1);
  });

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Detected Services</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Service</Text>
          <Text style={styles.tableHeaderText}>Detected Resources</Text>
          <Text style={styles.tableHeaderText}>Issues</Text>
          <Text style={styles.tableHeaderText}>Status</Text>
        </View>
        {report.detectedServices.map((svc, i) => {
          const issueCount = issuesByService.get(svc) ?? 0;
          const isLast = i === report.detectedServices.length - 1;
          return (
            <View key={svc} style={isLast ? styles.tableRowLast : styles.tableRow}>
              <Text style={styles.tableCellBold}>{svc}</Text>
              <Text style={styles.tableCell}>Detected</Text>
              <Text style={issueCount > 0 ? styles.tableCellRed : styles.tableCellGreen}>
                {issueCount > 0 ? `${issueCount} issue${issueCount > 1 ? 's' : ''}` : 'None'}
              </Text>
              <Text style={issueCount > 0 ? styles.tableCellRed : styles.tableCellGreen}>
                {issueCount > 0 ? '⚠ Issue' : '✓ OK'}
              </Text>
            </View>
          );
        })}
      </View>

      <PageFooter pageNum={3} />
    </Page>
  );
}

function CostBreakdownPage({ data }: { data: PDFReportData }) {
  const { report } = data;
  const { breakdown, totalCurrentCost, totalOptimizedCost, totalMonthlySaving } = report.costSummary;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Cost Breakdown by Service</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Service</Text>
          <Text style={styles.tableHeaderText}>Current/mo</Text>
          <Text style={styles.tableHeaderText}>Optimized/mo</Text>
          <Text style={styles.tableHeaderText}>Saving/mo</Text>
          <Text style={styles.tableHeaderText}>Annual</Text>
        </View>
        {breakdown.map((b, i) => {
          const isLast = i === breakdown.length - 1;
          return (
            <View key={b.service} style={isLast ? styles.tableRowLast : styles.tableRow}>
              <Text style={styles.tableCellBold}>{b.service}</Text>
              <Text style={styles.tableCell}>{formatCurrency(b.currentMonthlyCost)}</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(b.optimizedMonthlyCost)}</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(b.monthlySaving)}</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(b.annualSaving)}</Text>
            </View>
          );
        })}
        <View style={styles.tableRowTotal}>
          <Text style={styles.tableCellBold}>TOTAL</Text>
          <Text style={styles.tableCellBold}>{formatCurrency(totalCurrentCost)}</Text>
          <Text style={[styles.tableCellGreen, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalOptimizedCost)}</Text>
          <Text style={[styles.tableCellGreen, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalMonthlySaving)}</Text>
          <Text style={[styles.tableCellGreen, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalMonthlySaving * 12)}</Text>
        </View>
      </View>

      <PageFooter pageNum={4} />
    </Page>
  );
}

function IssuesPage({ data }: { data: PDFReportData }) {
  const { report } = data;
  const explanationMap = new Map(report.aiExplanations.map((e) => [e.issueId, e]));

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Issues & Recommendations</Text>

      {report.issues.slice(0, 6).map((issue) => {
        const explanation = explanationMap.get(issue.id);
        return (
          <View key={issue.id} style={styles.issueBlock}>
            <View style={styles.issueHeader}>
              <Text style={styles.issueTitle}>{issue.issue}</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) }]}>
                <Text>{issue.severity.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.issueBody}>
              <Text style={styles.issueDesc}>{issue.description}</Text>
              <View style={styles.issueConfigRow}>
                <View style={styles.issueConfigBox}>
                  <Text style={styles.issueConfigLabel}>Current</Text>
                  <Text style={styles.issueConfigValue}>{issue.currentConfig}</Text>
                  <Text style={[styles.issueConfigValue, { color: BRAND_COLORS.danger, marginTop: 2 }]}>
                    {formatCurrency(issue.currentCost)}/mo
                  </Text>
                </View>
                <View style={[styles.issueConfigBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                  <Text style={[styles.issueConfigLabel, { color: BRAND_COLORS.success }]}>Recommended</Text>
                  <Text style={[styles.issueConfigValue, { color: BRAND_COLORS.success }]}>{issue.recommendedConfig}</Text>
                  <Text style={[styles.issueConfigValue, { color: BRAND_COLORS.success, marginTop: 2 }]}>
                    {formatCurrency(issue.optimizedCost)}/mo → Save {formatCurrency(issue.saving)}/mo
                  </Text>
                </View>
              </View>
              {explanation && (
                <View style={styles.aiExplanation}>
                  <Text style={styles.aiLabel}>AI Analysis (Claude)</Text>
                  <Text style={styles.aiText}>{explanation.explanation}</Text>
                  <Text style={[styles.aiText, { color: BRAND_COLORS.primary, marginTop: 4 }]}>
                    Risk: {explanation.riskLevel.toUpperCase()} · {explanation.whenToApply}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      <PageFooter pageNum={5} />
    </Page>
  );
}

function RoadmapPage({ data }: { data: PDFReportData }) {
  const { issues } = data.report;
  const { quickWins, mediumEffort, needsPlanning } = buildOptimizationRoadmap(issues);

  const phases = [
    { title: 'Phase 1 — Quick Wins (< 1 hour)', items: quickWins, color: BRAND_COLORS.success },
    { title: 'Phase 2 — Medium Effort (1–4 hours)', items: mediumEffort, color: BRAND_COLORS.warning },
    { title: 'Phase 3 — Needs Planning (1+ days)', items: needsPlanning, color: BRAND_COLORS.primary },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Optimization Roadmap</Text>

      {phases.map((phase) => (
        <View key={phase.title} style={styles.roadmapPhase}>
          <View style={[styles.roadmapHeader, { backgroundColor: phase.color + '15', borderBottomColor: phase.color + '30' }]}>
            <Text style={[styles.roadmapTitle, { color: phase.color }]}>{phase.title}</Text>
            <Text style={[styles.roadmapTitle, { color: phase.color }]}>
              {formatCurrency(phase.items.reduce((s: number, i: DetectedIssue) => s + i.saving, 0))}/mo
            </Text>
          </View>
          {phase.items.length === 0 ? (
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 9, color: '#94A3B8' }}>None in this phase</Text>
            </View>
          ) : (
            (phase.items as DetectedIssue[]).map((item, idx) => (
              <View key={item.id} style={[styles.roadmapItem, idx === phase.items.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <Text style={styles.roadmapItemText}>
                  {idx + 1}. {item.issue} ({item.service})
                </Text>
                <Text style={styles.roadmapItemSaving}>+{formatCurrency(item.saving)}/mo</Text>
              </View>
            ))
          )}
        </View>
      ))}

      <PageFooter pageNum={6} />
    </Page>
  );
}

function DisclaimerPage({ data }: { data: PDFReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Disclaimer & Notes</Text>

      <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1E293B', marginBottom: 10 }}>
          Important: Review Before Applying
        </Text>
        <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.7, marginBottom: 8 }}>
          Estimates are based on static analysis of your infrastructure configuration files. Actual savings may vary based on:
        </Text>
        {[
          'Actual usage patterns and traffic volumes',
          'Current AWS pricing in your region (prices change regularly)',
          'Reserved Instance or Savings Plan discounts you may already have',
          'Application-specific performance requirements',
          'Multi-region or compliance requirements',
        ].map((item, i) => (
          <Text key={i} style={{ fontSize: 9, color: '#475569', marginBottom: 4, paddingLeft: 10 }}>
            • {item}
          </Text>
        ))}
      </View>

      <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 20 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E293B', marginBottom: 8 }}>
          CloudSave AI by LogicSpark Technology LLP
        </Text>
        <Text style={{ fontSize: 9, color: '#64748B', lineHeight: 1.6 }}>
          This report was generated automatically by CloudSave AI using static infrastructure analysis. No real AWS API calls were made. All pricing is based on publicly available AWS pricing data.
        </Text>
        <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 12 }}>
          Generated: {formatShortDate(data.generatedAt)} · Version {data.version}
        </Text>
      </View>

      <PageFooter pageNum={7} />
    </Page>
  );
}

// ===== MAIN DOCUMENT =====

interface ReportPDFProps {
  data: PDFReportData;
}

/** 7-page PDF report document */
export function ReportPDF({ data }: ReportPDFProps) {
  return (
    <Document
      title={`CloudSave AI Report — ${data.report.inputFileName}`}
      author="CloudSave AI by LogicSpark Technology LLP"
      subject="AWS Infrastructure Cost Optimization Report"
      creator="CloudSave AI v1.0"
    >
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <DetectedServicesPage data={data} />
      <CostBreakdownPage data={data} />
      <IssuesPage data={data} />
      <RoadmapPage data={data} />
      <DisclaimerPage data={data} />
    </Document>
  );
}
