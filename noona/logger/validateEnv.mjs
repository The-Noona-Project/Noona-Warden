import chalk from 'chalk';
import {
    printDivider,
    printSection,
    printResult,
    printWarning,
    printError
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

    for (const key of requiredKeys) {
        if (!process.env[key]) {
            missingRequired.push(key);
        }
    }

    for (const key of optionalKeys) {
        if (!process.env[key]) {
            missingOptional.push(key);
        }
    }

    if (missingRequired.length > 0) {
        printDivider();
        printError('❌ Missing Required Environment Variables:\n');
        for (const key of missingRequired) {
            console.log(`  ${chalk.redBright('•')} ${chalk.bold(key)}`);
        }
        printDivider();
        console.log();
        process.exit(1);
    }

    if (missingOptional.length > 0) {
        printWarning('⚠ Missing Optional Environment Variables:\n');
        for (const key of missingOptional) {
            console.log(`  ${chalk.yellow('•')} ${chalk.bold(key)}`);
        }
        console.log();
    }

    printResult('✔ Environment validated');
    printDivider();
}
