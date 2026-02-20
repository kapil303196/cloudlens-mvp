/**
 * CloudSave AI — Sanity Storage API Route
 * POST /api/sanity
 * Saves an analysis report to Sanity CMS.
 * @module app/api/sanity
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisReport } from '../../../lib/types';
import { sanityClient } from '../../../lib/sanity/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { report: AnalysisReport };
    const { report } = body;

    if (!report?.id) {
      return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 });
    }

    const doc = {
      _type: 'analysisReport',
      reportId: report.id,
      inputFileName: report.inputFileName,
      inputFileType: report.inputFileType,
      infraSummary: JSON.stringify(report.infra),
      detectedServices: report.detectedServices,
      issuesDetected: JSON.stringify(report.issues),
      totalCurrentCost: report.costSummary.totalCurrentCost,
      totalOptimizedCost: report.costSummary.totalOptimizedCost,
      totalSavings: report.costSummary.totalMonthlySaving,
      savingPercent: report.costSummary.savingPercent,
      aiExplanations: JSON.stringify(report.aiExplanations),
      createdAt: report.createdAt,
    };

    const result = await sanityClient.create(doc);
    return NextResponse.json({ id: result._id }, { status: 201 });
  } catch (err) {
    console.error('[sanity] Error saving report:', err);
    return NextResponse.json(
      { error: 'Failed to save report to Sanity' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');

    const query = reportId
      ? `*[_type == "analysisReport" && reportId == $reportId][0]`
      : `*[_type == "analysisReport"] | order(createdAt desc)[0...20]`;

    const result = await sanityClient.fetch(query, reportId ? { reportId } : {});
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error('[sanity] Error fetching reports:', err);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
