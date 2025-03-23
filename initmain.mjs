// initmain.mjs

import dotenv from 'dotenv';
dotenv.config();

import {
    printBanner,
    printResult,
    printSection,
    printDivider,
    printError
} from './noona/logger/logUtils.mjs';

import { validateEnv } from './noona/logger/validateEnv.mjs';
import { generateKeys } from './noona/jwt/generateKeys.mjs';
import { sendPublicKeyToRedis } from './noona/jwt/sendToRedis.mjs';
import { stopRunningNoonaContainers } from './docker/containerManager.mjs';
import { ensureNetworkExists } from './docker/buildNetwork.mjs';
import { buildFolderTree } from './noona/filesystem/buildTree.mjs';
import { pullDependencyImages } from './docker/downloadImages.mjs';
import { createOrStartContainer } from './docker/createOrStartContainer.mjs';

// 🩺 Startup Banner
printBanner('Noona');

(async () => {
    try {
        // Step 0: Validate Environment
        validateEnv(
            [
                'NODE_ENV',
                'JWT_SECRET',
                'MONGO_USER',
                'MONGO_PASSWORD',
                'MONGO_DATABASE',
                'REDIS_HOST',
                'REDIS_PORT',
                'MARIADB_USER',
                'MARIADB_PASSWORD',
                'MARIADB_DATABASE',
                'MILVUS_ADDRESS'
            ],
            [
                'DISCORD_CLIENT_ID',
                'DISCORD_TOKEN',
                'KAVITA_API_KEY',
                'KAVITA_SERVER_URL',
                'PORTAL_JWT_SECRET',
                'VAULT_API_URL'
            ]
        );

        // Step 1: Generate JWT Keys
        printSection('🔐 Generating JWT Key Pair');
        await generateKeys();
        printResult('✔ JWT Keys generated');

        // Step 2: Docker Access Check
        printSection('🐳 Checking Docker Access');
        const Docker = (await import('dockerode')).default;
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const version = await docker.version();
        printResult(`✔ Docker Version: ${version.Version}`);

        // Step 3: Stop Existing Containers
        printSection('🛑 Stopping Running Noona Containers');
        await stopRunningNoonaContainers();
        printResult('✔ Noona containers stopped');

        // Step 4: Create Required Networks
        printSection('🌐 Ensuring Networks Exist');
        await ensureNetworkExists('bridge');
        await ensureNetworkExists('noona-network');
        printResult('✔ Docker networks ready');

        // Step 5: Connect Warden to Networks
        printSection('🔗 Connecting Warden to Networks');
        const wardenContainerId = process.env.HOSTNAME;
        const networksToConnect = ['bridge', 'noona-network'];

        for (const netName of networksToConnect) {
            try {
                const network = docker.getNetwork(netName);
                await network.connect({ Container: wardenContainerId });
                printResult(`✔ Connected to network: ${netName}`);
            } catch (err) {
                if (!err.message.includes('already exists')) {
                    printError(`❌ Failed to connect to ${netName}: ${err.message}`);
                }
            }
        }

        // Step 6: Create Folder Tree
        printSection('📂 Building Folder Tree');
        await buildFolderTree();

        // Step 7: Pull Docker Images
        printSection('📦 Downloading Docker Images');
        await pullDependencyImages();
        printResult('✔ All dependency images downloaded');

        // Step 8: Start Containers One-by-One
        printSection('🚀 Creating and Starting Containers');
        await createOrStartContainer('noona-redis');
        await createOrStartContainer('noona-mongodb');
        await createOrStartContainer('noona-mariadb');
        await createOrStartContainer('milvus-etcd');
        await createOrStartContainer('milvus-minio');
        await createOrStartContainer('noona-milvus');
        printResult('✔ Dependency containers created & started');

        // Step 9: Send Public JWT Key to Redis
        printSection('📨 Sending JWT Public Key to Redis');
        await sendPublicKeyToRedis();
        printResult('✔ Public key shared with Redis');

        // Done!
        printDivider();
        printResult('✅ Noona-Warden Boot Complete');
        printDivider();
    } catch (err) {
        if (err?.code === 'EACCES') {
            printError('❌ Docker socket not accessible: EACCES /var/run/docker.sock');
        } else if (err?.code === 'ECONNREFUSED') {
            printError('❌ Docker socket not accessible: ECONNREFUSED /var/run/docker.sock');
        } else {
            printError('❌ Boot error:');
            console.error(err);
        }
        process.exit(1);
    }
})();
