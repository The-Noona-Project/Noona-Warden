// docker/downloadImages.mjs

import Docker from 'dockerode';
import { handlePullProgress } from './displayPull.mjs';
import { getImageSize, formatBytes } from './getMetadata.mjs';
import {
    printSubHeader,
    printSpacer,
    printDivider,
    printError,
    printNote,
    printDownloadSummary, // New summary function
    printResult
} from '../noona/logger/logUtils.mjs';
import { containerPresets } from './containerPresets.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Checks if an image already exists locally
 * @param {string} imageName
 * @returns {Promise<boolean>}
 */
async function imageExistsLocally(imageName) {
    try {
        const images = await docker.listImages();
        return images.some(img => img.RepoTags?.includes(imageName));
    } catch (err) {
        printError(`❌ Failed to check local images: ${err.message}`);
        return false;
    }
}

/**
 * Pulls all required dependency images and displays download status.
 */
export async function pullDependencyImages() {
    printDivider();
    printSubHeader('📦 Downloading Docker Images');
    printDivider();

    const uniqueImages = [
        ...new Set(Object.values(containerPresets).map(p => p.Image))
    ];

    for (const imageName of uniqueImages) {
        printSpacer();
        printSubHeader(`📦 Image: ${imageName}`);

        try {
            const exists = await imageExistsLocally(imageName);

            if (exists) {
                printResult(`✔ Reusing image: ${imageName}`);
                const size = await getImageSize(imageName);
                printNote(`› › Total Size: ${formatBytes(size)}`);
                printDivider();
                continue;
            }

            await handlePullProgress(docker, await docker.pull(imageName), imageName);

        } catch (err) {
            printError(`❌ Failed to pull ${imageName}: ${err.message}`);
            printDivider();
        }
    }

    printDownloadSummary(); // Clear, concise summary after all images are downloaded
}
