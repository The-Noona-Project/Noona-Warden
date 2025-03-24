// noona/filesystem/buildTree.mjs

import { promises as fs } from 'fs';
import path from 'path';
import {
    printResult,
    printWarning,
    printError,
    printDivider,
    printSection
} from '../logger/logUtils.mjs';

const ROOT_PATH = path.resolve('..'); // One level above /noona/warden

const COMPONENTS = [
    'Noona-Moon',
    'Noona-Oracle',
    'Noona-Portal',
    'Noona-Raven',
    'Noona-Sage',
    'Noona-Vault',
    'Noona-Warden',
];

const DEPENDENCIES = {
    'Noona-Vault': ['Redis', 'MongoDB', 'MariaDB', 'Milvus', 'Etcd', 'Minio'],
};

/**
 * Ensure a folder exists and has proper permissions.
 * If permission is denied, try to auto-fix with chmod 0775.
 * @param {string} dirPath - Absolute path to the folder.
 */
const ensureDir = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        printWarning(`⚠ Failed to create ${dirPath}: ${err.message}`);
        return;
    }

    try {
        await fs.access(dirPath, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
        printResult(`✓ Created & Verified: ${dirPath}`);
    } catch (err) {
        if (err.code === 'EACCES') {
            printWarning(`⚠ Permission denied for: ${dirPath}`);
            try {
                await fs.chmod(dirPath, 0o775);
                await fs.access(dirPath, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
                printResult(`🔧 Fixed permissions: ${dirPath}`);
            } catch (fixErr) {
                printError(`❌ Failed to fix permissions: ${dirPath}`);
            }
        } else {
            printWarning(`⚠ Unknown access issue for ${dirPath}: ${err.message}`);
        }
    }
};

/**
 * Build the full folder tree for Noona components and their dependencies.
 */
export const buildFolderTree = async () => {
    printDivider();
    printSection('📂 Building Noona Project Folder Tree');

    for (const component of COMPONENTS) {
        const componentPath = path.join(ROOT_PATH, component);
        await ensureDir(componentPath);

        const deps = DEPENDENCIES[component];
        if (deps && deps.length) {
            for (const dep of deps) {
                const depPath = path.join(componentPath, dep);
                await ensureDir(depPath);
            }
        }
    }

    printResult('✔ Folder tree created');
    printDivider();
};
