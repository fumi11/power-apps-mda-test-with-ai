#!/usr/bin/env node

/**
 * AI Test Generator CLI
 *
 * Usage:
 *   npx ts-node src/generator/generator.ts --entity account --pattern crud
 *   npx ts-node src/generator/generator.ts --entity contact --pattern validation
 *
 * Patterns: crud, validation, navigation, bpf
 *
 * Reads metadata from metadata-cache/<entity>.json, builds a prompt for the
 * chosen pattern, calls the OpenAI API, and writes the result to tests/generated/.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { EntityInfo } from '../metadata/types';
import {
  buildCrudPrompt,
  buildValidationPrompt,
  buildNavigationPrompt,
  buildBpfPrompt,
} from './prompts/templates';

dotenv.config();

type Pattern = 'crud' | 'validation' | 'navigation' | 'bpf';

const PROMPT_BUILDERS: Record<Pattern, (entity: EntityInfo) => string> = {
  crud: buildCrudPrompt,
  validation: buildValidationPrompt,
  navigation: buildNavigationPrompt,
  bpf: buildBpfPrompt,
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const entityIndex = args.indexOf('--entity');
  const patternIndex = args.indexOf('--pattern');

  if (entityIndex === -1 || !args[entityIndex + 1]) {
    console.error('Usage: npx ts-node src/generator/generator.ts --entity <name> --pattern <pattern>');
    process.exit(1);
  }

  const entityName = args[entityIndex + 1];
  const pattern = (patternIndex !== -1 ? args[patternIndex + 1] : 'crud') as Pattern;

  if (!PROMPT_BUILDERS[pattern]) {
    console.error(`Unknown pattern: ${pattern}. Valid patterns: crud, validation, navigation, bpf`);
    process.exit(1);
  }

  // Load metadata
  const metadataPath = path.join(process.cwd(), 'metadata-cache', `${entityName}.json`);
  if (!fs.existsSync(metadataPath)) {
    console.error(`Metadata not found: ${metadataPath}`);
    console.error('Run metadata extraction first: npx ts-node src/metadata/extractor.ts --entity ' + entityName);
    process.exit(1);
  }

  const entityInfo: EntityInfo = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`Generating ${pattern} test for entity: ${entityName}`);

  // Build prompt
  const prompt = PROMPT_BUILDERS[pattern](entityInfo);

  // Call OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  console.log(`  Calling OpenAI (${model})...`);
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 4096,
  });

  const generatedCode = completion.choices[0]?.message?.content;
  if (!generatedCode) {
    console.error('No code generated from OpenAI');
    process.exit(1);
  }

  // Clean up: remove markdown fences if present
  const cleanCode = generatedCode
    .replace(/^```typescript\n?/m, '')
    .replace(/^```\n?/m, '')
    .replace(/\n?```$/m, '');

  // Write output
  const outputDir = path.join(process.cwd(), 'tests', 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${entityName}-${pattern}.spec.ts`);
  fs.writeFileSync(outputPath, cleanCode, 'utf-8');
  console.log(`Test generated: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error generating test:', err);
  process.exit(1);
});
