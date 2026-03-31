#!/usr/bin/env node

/**
 * Metadata Extractor CLI
 *
 * Usage:
 *   npx ts-node src/metadata/extractor.ts --entity account
 *   npx ts-node src/metadata/extractor.ts --entity contact
 *
 * Fetches entity metadata, form definitions, and view definitions from Dataverse
 * and saves them as JSON files in the metadata-cache/ directory.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { DataverseClient } from './dataverse-client';
import { buildEntityInfo } from './parser';

dotenv.config();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const entityIndex = args.indexOf('--entity');

  if (entityIndex === -1 || !args[entityIndex + 1]) {
    console.error('Usage: npx ts-node src/metadata/extractor.ts --entity <entityLogicalName>');
    process.exit(1);
  }

  const entityName = args[entityIndex + 1];
  console.log(`Extracting metadata for entity: ${entityName}`);

  const client = new DataverseClient();
  await client.authenticate();

  console.log('  Fetching entity definition...');
  const entityDef = await client.getEntityDefinition(entityName);

  console.log('  Fetching system forms...');
  const forms = await client.getSystemForms(entityName);

  console.log('  Fetching views...');
  const views = await client.getViews(entityName);

  const entityInfo = buildEntityInfo(entityDef, forms, views);

  // Save to metadata-cache/
  const cacheDir = path.join(process.cwd(), 'metadata-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const outputPath = path.join(cacheDir, `${entityName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(entityInfo, null, 2), 'utf-8');
  console.log(`Metadata saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error extracting metadata:', err);
  process.exit(1);
});
