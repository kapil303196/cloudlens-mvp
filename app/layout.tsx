/**
 * CloudSave AI — Root Layout
 * Provides global styles, fonts, and metadata.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CloudSave AI — AWS Cost Optimizer',
  description:
    'AI-powered AWS infrastructure cost analysis. Upload your CDK, Terraform, or CloudFormation files and get instant cost savings recommendations.',
  keywords: 'AWS, cost optimization, CDK, Terraform, CloudFormation, cloud savings',
  authors: [{ name: 'Prod Bois' }],
  openGraph: {
    title: 'CloudSave AI — AWS Cost Optimizer',
    description: 'Identify AWS cost savings in minutes with AI-powered static analysis.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
