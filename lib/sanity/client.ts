/**
 * CloudSave AI — Sanity Client Configuration
 * Sets up the Sanity client for storing and retrieving analysis reports.
 * @module lib/sanity/client
 */

import { createClient } from '@sanity/client';

/** Sanity client for server-side operations (with write token) */
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false, // Always fresh data for reports
});

/** Sanity client for public read-only operations */
export const sanityReadClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});
