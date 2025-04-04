// initmain.mjs

import { printBanner, printDivider, printSection, printResult, printError } from './noona/logger/logUtils.mjs';
import { manageFiles } from './noona/filesystem/fileSystemManager.mjs';
import { generateKeys } from './noona/jwt/generateKeys.mjs';
import { sendPublicKeyToRedis } from './noona/jwt/sendToRedis.mjs';
import { createAndStoreServiceToken } from './noona/jwt/createServiceToken.mjs';

import { stopContainer } from './docker/stop/stopContainer.mjs';
import { ensureNetworkExists } from './docker/build/buildNetwork.mjs';
import {
    pullDependencyImages,
    pullNoonaImages
} from './docker/build/downloadImages.mjs';

import { startContainer } from './docker/start/startContainer.mjs';
import { createContainer } from './docker/start/createContainer.mjs';

printBanner('Noona');

(async () => {
    try {
        // 1️⃣ File System Setup
        printSection('📂 File System Management');
        await manageFiles();

        // 2️⃣ Generate & Store JWT Keys
        printSection('🔑 Generating & Storing JWT Keys');
        await generateKeys();
        printResult('✔ JWT Keys generated and stored');

        // 3️⃣ Docker Access Check
        printSection('🐳 Checking Docker Access');
        const Docker = (await import('dockerode')).default;
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const version = await docker.version();
        printResult(`✔ Docker Version: ${version.Version}`);

        // 4️⃣ Stop Existing Noona Containers
        printSection('🧨 Stopping Noona Containers');
        const noonaContainers = [
            'noona-redis',
            'noona-mongodb',
            'noona-mariadb',
            'noona-vault',
            'noona-portal'
        ];
        for (const name of noonaContainers) {
            await stopContainer(name);
        }

        // 5️⃣ Ensure Required Docker Networks Exist
        printSection('🌐 Ensuring Docker Networks');
        await ensureNetworkExists('bridge');
        await ensureNetworkExists('noona-network');
        printResult('✔ Docker networks ready');

        // 6️⃣ Connect Warden to Networks
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

        // 7️⃣ Pull Docker Images
        printSection('📦 Pulling Dependency Images');
        await pullDependencyImages();

        printSection('📦 Pulling Noona Component Images');
        await pullNoonaImages();

        printResult('✔ All required Docker images available');

        // 8️⃣ Start Core Dependency Containers
        printSection('🚦 Starting Dependency Containers');
        await createContainer('noona-redis');
        await createContainer('noona-mongodb');
        await createContainer('noona-mariadb');
        printResult('✔ Core dependencies started');

        // 9️⃣ Send Public Key to Redis
        printSection('🛰️ Sending JWT Public Key to Redis');
        await sendPublicKeyToRedis();
        printResult('✔ Public JWT key shared with Redis');

        // 🔟 Create and Store Noona-Portal Token
        printSection('🔐 Creating Service Token for Noona-Portal');
        await createAndStoreServiceToken('noona-portal');
        printResult('✔ Service token created and stored');

// 🔒 Create Vault and Portal Containers Before Starting
        printSection('📦 Creating Noona Containers');
        await createContainer('noona-vault');
        await createContainer('noona-portal');

// 🧠 Start Noona-Vault
        printSection('🧠 Starting Noona-Vault');
        await startContainer('noona-vault');

// 🌙 Start Noona-Portal
        printSection('🌙 Starting Noona-Portal');
        await startContainer('noona-portal');

        // ✅ Done!
        printDivider();
        printResult('🏁 Noona-Warden Boot Complete');
        printDivider();

    } catch (err) {
        printError('❌ Boot error:');
        console.error(err);
        process.exit(1);
    }
})();
