// noona/filesystem/buildTree.mjs

import { promises as fs } from 'fs';
import path from 'path';
import {
    printResult,
    printWarning,
    printError,
    printDivider,
    printSection,
    printDebug
} from '../logger/logUtils.mjs';

// Define the full folder tree structure for the Noona Family project.
const TREE_STRUCTURE = {
    "Noona-Moon": {
        "files": {}
    },
    "Noona-Oracle": {
        "files": {}
    },
    "Noona-Portal": {
        "files": {}
    },
    "Noona-Raven": {
        "depends": {
            "noona-anythingllm": {
                "files": {}
            },
            "noona-localai": {
                "files": {}
            }
        },
        "files": {}
    },
    "Noona-Sage": {
        "depends": {
            "noona-grafana": {
                "files": {}
            },
            "noona-prometheus": {
                "files": {}
            }
        },
        "files": {}
    },
    "Noona-Vault": {
        "depends": {
            "noona-mariadb": {
                "files": {}
            },
            "noona-milvus": {
                "depends": {
                    "noona-etcd": {
                        "files": {}
                    },
                    "noona-minio": {
                        "files": {}
                    }
                },
                "files": {}
            },
            "noona-mongodb": {
                "files": {}
            },
            "noona-redis": {
                "files": {}
            }
        },
        "files": {}
    },
    "Noona-Warden": {
        "files": {}
    }
};

// Set the target root path for the folder tree.
// This directory should be mounted as /noona/family in your Docker containers.
const ROOT_PATH = path.resolve('noona-family');

/**
 * Ensure a directory exists and is accessible.
 * If access is denied, attempt to fix permissions.
 * Logs current permission levels as debug messages.
 *
 * @param {string} dirPath - Absolute path to the directory.
 */
const ensureDir = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        printDebug(`Directory created or already exists: ${dirPath}`);
    } catch (err) {
        printWarning(`⚠️ Failed to create directory: ${dirPath} - ${err.message}`);
        return;
    }

    try {
        await fs.access(dirPath, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
        const stats = await fs.stat(dirPath);
        printResult(`🗂️  Created & Verified: ${dirPath}`);
        printDebug(`Permissions for ${dirPath}: ${stats.mode.toString(8)}`);
    } catch (err) {
        if (err.code === 'EACCES') {
            printWarning(`⚠️ Permission denied for: ${dirPath}`);
            try {
                await fs.chmod(dirPath, 0o775);
                await fs.access(dirPath, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
                const stats = await fs.stat(dirPath);
                printResult(`🔧 Fixed permissions for: ${dirPath}`);
                printDebug(`Updated permissions for ${dirPath}: ${stats.mode.toString(8)}`);
            } catch (fixErr) {
                printError(`❌ Failed to fix permissions for: ${dirPath}`);
            }
        } else {
            printWarning(`⚠️ Unknown access issue for ${dirPath}: ${err.message}`);
        }
    }
};

/**
 * Recursively creates a folder tree based on a tree structure object.
 *
 * @param {string} basePath - The base path to start creating directories.
 * @param {object} tree - An object representing the directory tree.
 */
const createTree = async (basePath, tree) => {
    for (const dirName in tree) {
        const currentPath = path.join(basePath, dirName);
        printDebug(`Ensuring directory: ${currentPath}`);
        await ensureDir(currentPath);
        if (typeof tree[dirName] === 'object' && Object.keys(tree[dirName]).length > 0) {
            await createTree(currentPath, tree[dirName]);
        }
    }
};

/**
 * Build the full folder tree for the Noona Family project.
 */
export const buildFolderTree = async () => {
    printDivider();
    printSection('📂 Building Noona Family Folder Tree');
    printDebug(`Target root path for folder tree: ${ROOT_PATH}`);

    await createTree(ROOT_PATH, TREE_STRUCTURE);

    printResult('✔ Folder tree created successfully');
    printDivider();
};
