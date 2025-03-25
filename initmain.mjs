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

// Boot Banner
printBanner('Noona');

(async () => {
    try {
        // Validate Environment Variables
        validateEnv(
            [
                'NODE_ENV',
                'JWT_SECRET',
                'MONGO_USER',
                'MONGO_PASSWORD',
                'MONGO_DATABASE',
                'REDIS_URL',
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

        // Generate & Store JWT Keys
        printSection('Generating & Storing JWT Keys');
        await generateKeys();
        printResult('JWT Keys generated and stored');

        // Check Docker Access
        printSection('Checking Docker Access');
        const Docker = (await import('dockerode')).default;
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const version = await docker.version();
        printResult(`Docker Version: ${version.Version}`);

        // Stop Running Noona Containers
        printSection('Stopping Running Noona Containers');
        await stopRunningNoonaContainers();
        printResult('Noona containers stopped');

        // Ensure Docker Networks Exist
        printSection('Ensuring Docker Networks Exist');
        await ensureNetworkExists('bridge');
        await ensureNetworkExists('noona-network');
        printResult('Docker networks ready');

        // Connect Warden to Networks
        printSection('Connecting Warden to Networks');
        const wardenContainerId = process.env.HOSTNAME;
        const networksToConnect = ['bridge', 'noona-network'];
        for (const net of networksToConnect) {
            try {
                const network = docker.getNetwork(net);
                await network.connect({ Container: wardenContainerId });
                printResult(`Connected to network: ${net}`);
            } catch (err) {
                if (!err.message.includes('already exists')) {
                    printError(`Failed to connect to ${net}: ${err.message}`);
                }
            }
        }

        // Build Noona Project Folder Tree
        printSection('Building Noona Project Folder Tree');
        await buildFolderTree();

        // Pull Dependency Docker Images
        printSection('Downloading Dependency Docker Images');
        await pullDependencyImages();
        printResult('All dependency images downloaded');

        // Create & Start Dependency Containers
        printSection('Creating & Starting Dependency Containers');
        await createOrStartContainer('noona-redis');
        await createOrStartContainer('noona-mongodb');
        await createOrStartContainer('noona-mariadb');
        await createOrStartContainer('noona-etcd');
        await createOrStartContainer('noona-minio');
        await createOrStartContainer('noona-milvus');
        printResult('Dependency containers created & started');

        // Send Public JWT Key to Redis
        printSection('Sending Public JWT Key to Redis');
        await sendPublicKeyToRedis();
        printResult('Public JWT Key shared with Redis');

        // Boot Complete
        printDivider();
        printResult('Noona-Warden Boot Complete');
        printDivider();
    } catch (err) {
        if (err?.code === 'EACCES') {
            printError('Docker socket not accessible: EACCES /var/run/docker.sock');
        } else if (err?.code === 'ECONNREFUSED') {
            printError('Docker socket not accessible: ECONNREFUSED /var/run/docker.sock');
        } else {
            printError('Boot error:');
            console.error(err);
        }
        process.exit(1);
    }
})();
