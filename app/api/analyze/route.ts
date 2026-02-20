/**
 * CloudSave AI — Main Analysis API Route
 * POST /api/analyze
 * Orchestrates: upload → detect → parse → engine → AI → assemble report
 * @module app/api/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisReport, InfraFileType, NormalizedInfra, UploadedFile } from '../../../lib/types';
import { detectFileType, extractDetectedServices, parseFile } from '../../../lib/parsers';
import { detectAntiPatterns } from '../../../lib/engine/anti-patterns';
import { calculateCostSummary } from '../../../lib/engine/cost-calculator';
import { explainAllIssues, parseArchitectureImage } from '../../../lib/ai/claude';
import { generateReportId } from '../../../lib/utils/format';
import { APP_CONFIG } from '../../../lib/utils/constants';

export const maxDuration = 60; // 60 second timeout for Vercel

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > APP_CONFIG.maxFileSize) {
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.` },
        { status: 413 }
      );
    }

    // Read file content
    let content: string;
    const fileType = detectFileType(file.name, '');

    if (fileType === 'image') {
      // For images, read as base64
      const arrayBuffer = await file.arrayBuffer();
      content = Buffer.from(arrayBuffer).toString('base64');
    } else if (fileType === 'zip') {
      const arrayBuffer = await file.arrayBuffer();
      content = Buffer.from(arrayBuffer).toString('base64');
    } else {
      content = await file.text();
    }

    const detectedType = detectFileType(file.name, content);

    const uploadedFile: UploadedFile = {
      name: file.name,
      type: detectedType,
      content,
      size: file.size,
      parsedAt: new Date().toISOString(),
    };

    // Parse infrastructure
    let infra: NormalizedInfra | null = null;

    if (detectedType === 'image') {
      // Use Claude Vision for architecture diagrams
      const mediaType = (file.type as 'image/png' | 'image/jpeg' | 'image/webp') ?? 'image/png';
      const rawResult = await parseArchitectureImage(content, mediaType);
      infra = rawResult as NormalizedInfra;
    } else {
      infra = await parseFile(uploadedFile);
    }

    if (!infra || Object.keys(infra).length === 0) {
      return NextResponse.json(
        { error: 'Could not parse infrastructure from the provided file. Please ensure it contains valid AWS resource definitions.' },
        { status: 422 }
      );
    }

    // Detect anti-patterns
    const issues = detectAntiPatterns(infra);

    // Calculate costs
    const costSummary = calculateCostSummary(issues);

    // Get AI explanations (if API key is set)
    let aiExplanations = [];
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        aiExplanations = await explainAllIssues(issues);
      } catch (err) {
        console.error('[analyze] AI explanation failed, continuing without:', err);
        aiExplanations = [];
      }
    }

    // Assemble report
    const report: AnalysisReport = {
      id: generateReportId(),
      createdAt: new Date().toISOString(),
      infra,
      detectedServices: extractDetectedServices(infra),
      issues,
      costSummary,
      aiExplanations,
      inputFileName: file.name,
      inputFileType: detectedType,
    };

    // Optionally save to Sanity (non-blocking)
    if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
      saveToSanity(report).catch((err) =>
        console.error('[analyze] Sanity save failed:', err)
      );
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (err) {
    console.error('[analyze] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again with a valid infrastructure file.' },
      { status: 500 }
    );
  }
}

/** Non-blocking Sanity save helper */
async function saveToSanity(report: AnalysisReport): Promise<void> {
  await fetch('/api/sanity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report }),
  });
}
