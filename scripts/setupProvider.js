#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROVIDERS = ['spotify', 'deezer'];

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function checkDataFile(provider) {
  const dataFiles = {
    'spotify': 'src/data/triples-songs.json',
    'deezer': 'src/data/triples-deezer-songs.json'
  };

  const filePath = dataFiles[provider];
  return fs.existsSync(filePath);
}

function setupProvider(provider) {
  console.log(`\n🎵 Setting up ${provider.toUpperCase()} provider...\n`);

  // Check if data already exists
  if (checkDataFile(provider)) {
    console.log(`✅ ${provider} data already exists`);
  } else {
    console.log(`📥 Fetching ${provider} data...`);

    if (provider === 'deezer') {
      runCommand('npm run fetch-deezer-triples', `Fetching Deezer data`);
    } else if (provider === 'spotify') {
      runCommand('npm run fetch-triples', `Fetching Spotify data`);
    }
  }

  // Validate the provider
  runCommand(`npm run validate-provider src/data/triples-${provider === 'spotify' ? '' : 'deezer-'}songs.json ${provider}`,
            `Validating ${provider} data`);

  console.log(`🎉 ${provider.toUpperCase()} setup complete!`);
  console.log(`💡 To use ${provider}, set MUSIC_PROVIDER = '${provider}' in src/main.js\n`);
}

function showUsage() {
  console.log(`
🎵 Provider Setup Tool

Usage: npm run setup-provider [provider]

Providers:
  spotify    Set up Spotify provider (requires API keys)
  deezer     Set up Deezer provider (no auth needed!)

Examples:
  npm run setup-provider deezer     # Setup Deezer (recommended)
  npm run setup-provider spotify    # Setup Spotify
  npm run setup-provider            # Interactive mode

This tool will:
1. Fetch song data for the chosen provider
2. Validate data compatibility
3. Show you how to switch providers in the code
  `);
}

async function interactiveMode() {
  console.log('🎵 Interactive Provider Setup\n');
  console.log('Available providers:');
  PROVIDERS.forEach((provider, index) => {
    const hasData = checkDataFile(provider);
    const status = hasData ? '✅' : '❌';
    console.log(`  ${index + 1}. ${provider} ${status}`);
  });

  console.log('\nRecommendation: Use Deezer for better performance and no auth requirements!\n');

  // For now, just setup deezer as recommended
  setupProvider('deezer');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showUsage();
  process.exit(0);
}

const provider = args[0];

if (provider && !PROVIDERS.includes(provider)) {
  console.error(`❌ Invalid provider: ${provider}`);
  console.error(`Valid providers: ${PROVIDERS.join(', ')}`);
  process.exit(1);
}

try {
  if (provider) {
    setupProvider(provider);
  } else {
    interactiveMode();
  }
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
