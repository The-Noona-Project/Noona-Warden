// initmain.mjs

import {
    printBanner,
    printDivider,
    printSection,
    printResult,
    printError
} from './noona/logger/logUtils.mjs';

import { manageFiles } from './noona/filesystem/fileSystemManager.mjs';
import { generateKeys } from './noona/jwt/generateKeys.mjs';
import { sendPublicKeyToRedis } from './noona/jwt/sendToRedis.mjs';
import { createAndStoreServiceToken } from './noona/jwt/createServiceToken.mjs';
import { manageContainers } from './docker/containerManager.mjs';

printBanner('Noona');

(async () => {
    try {
        // 🧾 Filesystem + Configuration Setup
        printSection('📂 File & Config Setup');
        await manageFiles();

        // 🔐 JWT Key Generation
        printSection('🔑 JWT Key Generation');
        await generateKeys();
        printResult('✔ JWT Keys generated and stored');

        // 📦 Container Bootstrapping
        await manageContainers();

        // 🛰️ JWT Public Key → Redis
        printSection('📡 Sending JWT Public Key to Redis');
        await sendPublicKeyToRedis();
        printResult('✔ Public JWT key shared with Redis');

        // 🔐 Noona-Portal Service Token
        printSection('🔐 Creating Noona-Portal Service Token');
        await createAndStoreServiceToken('noona-portal');
        printResult('✔ Service token created and stored');

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
