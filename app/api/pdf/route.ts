/**
 * CloudSave AI — PDF Generation API Route
 * POST /api/pdf
 * Generates and returns a PDF report buffer.
 * @module app/api/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisReport } from '../../../lib/types';
import { generatePDFBuffer } from '../../../lib/pdf/generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { report: AnalysisReport };

    if (!body.report?.id) {
      return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 });
    }

    const buffer = await generatePDFBuffer(body.report);
    const fileName = `cloudsave-report-${body.report.id}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[pdf] Error generating PDF:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
