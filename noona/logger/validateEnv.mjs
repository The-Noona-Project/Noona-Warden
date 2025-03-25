// noona/logger/validateEnv.mjs

import chalk from 'chalk';
import {
    printDivider,
    printSection,
    printResult,
    printWarning,
    printError,
    printDebug
} from '../logger/logUtils.mjs';

/**
 * 🌱 Validates required and optional environment variables.
 * Exits the process if any required variables are missing.
 *
 * @param {string[]} requiredKeys - Environment variables that must be set.
 * @param {string[]} [optionalKeys=[]] - Environment variables that are optional but recommended.
 */
export function validateEnv(requiredKeys = [], optionalKeys = []) {
    printSection('🌱 Validating Environment Variables');

    const missingRequired = [];
    const missingOptional = [];

    // Check required environment variables
    for (const key of requiredKeys) {
        if (!process.env[key]) {
            missingRequired.push(key);
        }
    }

    // Check optional environment variables
    for (const key of optionalKeys) {
        if (!process.env[key]) {
            missingOptional.push(key);
        }
    }

    // If NODE_ENV is set to "development", log details for all checked variables.
    const isDebug = process.env.NODE_ENV &&
        process.env.NODE_ENV.trim().toLowerCase() === 'development';
    if (isDebug) {
        printDivider();
        printDebug('Development mode enabled. Listing all validated environment variables:');
        const allKeys = [...requiredKeys, ...optionalKeys];
        for (const key of allKeys) {
            if (process.env[key]) {
                console.log(`  ${chalk.green('✔')} ${chalk.bold(key)} = ${process.env[key]}`);
            } else {
                console.log(`  ${chalk.red('✖')} ${chalk.bold(key)} is missing`);
            }
        }
        printDivider();
    }

    if (missingRequired.length > 0) {
        printDivider();
        printError('Missing Required Environment Variables:\n');
        for (const key of missingRequired) {
            console.log(`  ${chalk.redBright('•')} ${chalk.bold(key)}`);
        }
        printDivider();
        console.log();
        process.exit(1);
    }

    if (missingOptional.length > 0) {
        printWarning('Missing Optional Environment Variables:\n');
        for (const key of missingOptional) {
            console.log(`  ${chalk.yellow('•')} ${chalk.bold(key)}`);
        }
        console.log();
    }

    printResult('Environment validated');
    printDivider();
}
