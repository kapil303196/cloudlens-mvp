/**
 * CloudSave AI — Claude AI Explanation API Route
 * POST /api/explain
 * Generates a single issue explanation via Claude API.
 * @module app/api/explain
 */

import { NextRequest, NextResponse } from 'next/server';
import type { DetectedIssue } from '../../../lib/types';
import { explainIssue } from '../../../lib/ai/claude';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { issue: DetectedIssue };

    if (!body.issue?.id) {
      return NextResponse.json({ error: 'Invalid issue payload' }, { status: 400 });
    }

    const explanation = await explainIssue(body.issue);
    return NextResponse.json({ explanation }, { status: 200 });
  } catch (err) {
    console.error('[explain] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
