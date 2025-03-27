// initmain.mjs

import dotenv from 'dotenv';
dotenv.config({ path: '/noona/family/noona-warden/settings/config.env' });

import {
    printBanner,
    printDivider,
    printSection,
    printResult,
    printError
} from './noona/logger/logUtils.mjs';

import { validateEnv } from './noona/logger/validateEnv.mjs';
import { generateKeys } from './noona/jwt/generateKeys.mjs';
import { sendPublicKeyToRedis } from './noona/jwt/sendToRedis.mjs';
import {
    stopRunningNoonaContainers,
    startDependencies,
    startContainer
} from './docker/containerManager.mjs';
import { ensureNetworkExists } from './docker/buildNetwork.mjs';
import { buildFolderTree } from './noona/filesystem/buildTree.mjs';
import { pullDependencyImages } from './docker/downloadImages.mjs';
import { createOrStartContainer } from './docker/createOrStartContainer.mjs';

// Boot Banner
printBanner('Noona');

(async () => {
    try {
        // Validate Environment Variables
        validateEnv(
            [
                // ── Core Runtime ──
                'NODE_ENV',
                'JWT_SECRET',
                'JWT_PRIVATE_KEY_PATH',
                'JWT_PUBLIC_KEY_PATH',
                'VAULT_JWT',

                // ── Vault: Databases ──
                'MONGO_URL',
                'REDIS_URL',
                'MARIADB_USER',
                'MARIADB_PASSWORD',
                'MARIADB_DATABASE',

                // ── Vault API Port ──
                'VAULT_PORT'
            ],
            [
                // ── Portal: Features ──
                'PORTAL_PORT',
                'DISCORD_CLIENT_ID',
                'DISCORD_TOKEN',
                'KAVITA_API_KEY',
                'KAVITA_URL',
                'VAULT_URL',
                'PORTAL_JWT_SECRET',

                // ── Optional: Port Overrides ──
                'MONGODB_PORT',
                'MARIADB_PORT',

                // ── Optional: Runtime Settings ──
                'CHECK_INTERVAL_HOURS'
            ]
        );

        // Generate & Store JWT Keys
        printSection('🔑 Generating & Storing JWT Keys');
        await generateKeys();
        printResult('✔ JWT Keys generated and stored');

        // Check Docker Access
        printSection('🐳 Checking Docker Access');
        const Docker = (await import('dockerode')).default;
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const version = await docker.version();
        printResult(`✔ Docker Version: ${version.Version}`);

        // Stop Running Noona Containers
        printSection('🧨 Stopping Running Noona Containers');
        await stopRunningNoonaContainers();
        printResult('✔ Noona containers stopped');

        // Ensure Docker Networks Exist
        printSection('🌐 Ensuring Docker Networks Exist');
        await ensureNetworkExists('bridge');
        await ensureNetworkExists('noona-network');
        printResult('✔ Docker networks ready');

        // Connect Warden to Networks
        printSection('🔌 Connecting Warden to Networks');
        const wardenContainerId = process.env.HOSTNAME;
        const networksToConnect = ['bridge', 'noona-network'];
        for (const net of networksToConnect) {
            try {
                const network = docker.getNetwork(net);
                await network.connect({ Container: wardenContainerId });
                printResult(`✔ Connected to network: ${net}`);
            } catch (err) {
                if (!err.message.includes('already exists')) {
                    printError(`❌ Failed to connect to ${net}: ${err.message}`);
                }
            }
        }

        // Build Noona Project Folder Tree
        printSection('📁 Building Noona Project Folder Tree');
        await buildFolderTree();

        // Pull Dependency Docker Images
        printSection('📦 Downloading Dependency Docker Images');
        await pullDependencyImages();
        printResult('✔ All dependency images downloaded');

        // Start Core Dependencies (Redis, MongoDB, MariaDB)
        printSection('🚀 Creating & Verifying Core Dependencies');
        await startDependencies();

        // Start Noona-Vault
        printSection('🔐 Starting Noona-Vault');
        await createOrStartContainer('noona-vault');

        // Send Public JWT Key to Redis
        printSection('🛰️ Sending Public JWT Key to Redis');
        await sendPublicKeyToRedis();
        printResult('✔ Public JWT Key shared with Redis');

        // Start Noona-Portal
        printSection('🌙 Starting Noona-Portal');
        await createOrStartContainer('noona-portal');
        printResult('✔ Noona-Portal is running');

        // Boot Complete
        printDivider();
        printResult('🏁 Noona-Warden Boot Complete');
        printDivider();
    } catch (err) {
        if (err?.code === 'EACCES') {
            printError('Docker socket not accessible: EACCES /var/run/docker.sock');
        } else if (err?.code === 'ECONNREFUSED') {
            printError('Docker socket not accessible: ECONNREFUSED /var/run/docker.sock');
        } else {
            printError('❌ Boot error:');
            console.error(err);
        }
        process.exit(1);
    }
})();
