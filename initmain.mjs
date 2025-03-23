// initmain.mjs

import dotenv from 'dotenv';
dotenv.config();

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
import { stopRunningNoonaContainers } from './docker/containerManager.mjs';
import { ensureNetworkExists } from './docker/buildNetwork.mjs';
import { buildFolderTree } from './noona/filesystem/buildTree.mjs';
import { pullDependencyImages } from './docker/downloadImages.mjs';
import { createOrStartContainer } from './docker/createOrStartContainer.mjs';

// 🩺 Boot Banner
printBanner('Noona');

(async () => {
    try {
        // 🌱 0. Validate Environment
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

        // 🔐 1. Generate JWT Keys
        printSection('🔐 Generating JWT Key Pair');
        await generateKeys();
        printResult('✔ JWT Keys generated');

        // 🐳 2. Check Docker Access
        printSection('🐳 Checking Docker Access');
        const Docker = (await import('dockerode')).default;
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const version = await docker.version();
        printResult(`✔ Docker Version: ${version.Version}`);

        // 🛑 3. Stop Running Containers
        printSection('🛑 Stopping Running Noona Containers');
        await stopRunningNoonaContainers();
        printResult('✔ Noona containers stopped');

        // 🌐 4. Ensure Docker Networks Exist
        printSection('🌐 Ensuring Networks Exist');
        await ensureNetworkExists('bridge');
        await ensureNetworkExists('noona-network');
        printResult('✔ Docker networks ready');

        // 🔗 5. Connect Warden to Networks
        printSection('🔗 Connecting Warden to Networks');
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

        // 📂 6. Build Project Folder Tree
        printSection('📂 Building Folder Tree');
        await buildFolderTree();

        // 📦 7. Pull All Docker Images
        printSection('📦 Downloading Docker Images');
        await pullDependencyImages();
        printResult('✔ All dependency images downloaded');

        // 🚀 8. Start All Dependency Containers
        printSection('🚀 Creating and Starting Containers');
        await createOrStartContainer('noona-redis');
        await createOrStartContainer('noona-mongodb');
        await createOrStartContainer('noona-mariadb');
        await createOrStartContainer('milvus-etcd');
        await createOrStartContainer('milvus-minio');
        await createOrStartContainer('noona-milvus');
        printResult('✔ Dependency containers created & started');

        // 📨 9. Send Public JWT Key to Redis
        printSection('📨 Sending JWT Public Key to Redis');
        await sendPublicKeyToRedis();
        printResult('✔ Public key shared with Redis');

        // ✅ Done!
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
