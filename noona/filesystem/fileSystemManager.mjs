// noona/filesystem/fileSystemManager.mjs
import { buildFolderTree } from './build/buildTree.mjs';
import { buildConfig } from './build/buildConfig.mjs';
import { loadConfig } from './load/loadConfig.mjs';
import { validateEnv } from './load/validateEnv.mjs';
import { printResult, printDivider, printSection, printError } from '../logger/logUtils.mjs';

export async function manageFiles() {
    try {
        printDivider();
        printSection('FILE SYSTEM MANAGEMENT: Starting file system management');

        // 1. Build the folder tree.
        await buildFolderTree();

        // 2. Create the configuration file with default values (if it doesn't exist).
        await buildConfig();

        // 3. Load the configuration from YAML into process.env.
        await loadConfig();

        // 4. Validate required and optional environment variables.
        validateEnv(
            [
                "NODE_ENV",
                "JWT_SECRET",
                "JWT_PRIVATE_KEY_PATH",
                "JWT_PUBLIC_KEY_PATH",
                "VAULT_JWT",
                "MONGO_URL",
                "REDIS_URL",
                "MARIADB_USER",
                "MARIADB_PASSWORD",
                "MARIADB_DATABASE",
                "VAULT_PORT"
            ],
            [
                "PORTAL_PORT",
                "DISCORD_TOKEN",
                "DISCORD_CLIENT_ID",
                "REQUIRED_GUILD_ID",
                "REQUIRED_ROLE_ADMIN",
                "REQUIRED_ROLE_MOD",
                "REQUIRED_ROLE_USER",
                "NOTIFICATION_CHANNEL_ID",
                "CHECK_INTERVAL_HOURS",
                "KAVITA_LOOKBACK_HOURS",
                "KAVITA_URL",
                "KAVITA_API_KEY",
                "KAVITA_LIBRARY_IDS"
            ]
        );

        printResult('FILE SYSTEM MANAGEMENT: Completed file system management');
        printDivider();
    } catch (err) {
        printError(`FILE SYSTEM MANAGEMENT: Error during file system management: ${err.message}`);
        throw err;
    }
}

// If this module is the entry point, run manageFiles().
if (process.argv[1] === new URL(import.meta.url).pathname) {
    manageFiles();
}
