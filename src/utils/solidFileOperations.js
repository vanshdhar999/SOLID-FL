import { getFile, saveFileInContainer, overwriteFile, getSourceUrl, createContainerAt, getSolidDataset, deleteFile, getContainedResourceUrlAll } from "@inrupt/solid-client";
import { readFile, writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

/**
 * Creates a container in the Solid Pod
 * @param {string} podRoot - The root URL of the pod
 * @param {string} containerPath - The path of the container to create
 * @param {Function} fetch - The authenticated fetch function
 * @returns {Promise<string>} - The URL of the created container
 */
export async function createContainerInPod(podRoot, containerPath, fetch) {
    try {
        // Ensure podRoot ends with /
        podRoot = podRoot.endsWith('/') ? podRoot : podRoot + '/';
        containerPath = containerPath.endsWith('/') ? containerPath : containerPath + '/';
        
        const containerUrl = `${podRoot}${containerPath}`;
        
        // First check if container exists
        try {
            const container = await getSolidDataset(containerUrl, { fetch });
            console.log(`Container already exists at ${getSourceUrl(container)}`);
            return getSourceUrl(container);
        } catch (error) {
            if (error.statusCode === 404) {
                // Container doesn't exist, create it
                const container = await createContainerAt(containerUrl, { fetch });
                console.log(`Container created at ${getSourceUrl(container)}`);
                return getSourceUrl(container);
            }
            throw error;
        }
    } catch (error) {
        if (error.statusCode === 403) {
            throw new Error(`Access denied to create container at ${podRoot}${containerPath}. Please check your credentials and permissions.`);
        }
        if (error.statusCode === 409) {
            // Container already exists, which is fine
            return `${podRoot}${containerPath}`;
        }
        throw error;
    }
}

/**
 * Saves a file to a container in the Solid Pod
 * @param {string} containerUrl - The URL of the container
 * @param {string|Buffer} content - The content to save
 * @param {string} contentType - The MIME type of the content
 * @param {string} filename - The name of the file
 * @param {Function} fetch - The authenticated fetch function
 * @returns {Promise<string>} - The URL of the saved file
 */
export async function saveFileToPod(containerUrl, content, contentType, filename, fetch) {
    try {
        // Ensure container exists
        await createContainerInPod(containerUrl, '', fetch);
        
        // Ensure containerUrl ends with /
        containerUrl = containerUrl.endsWith('/') ? containerUrl : containerUrl + '/';
        
        const fileUrl = `${containerUrl}${filename}`;
        const blob = new Blob([content], { type: contentType });
        
        try {
            // First try to save as a new file
            const savedFile = await saveFileInContainer(
                containerUrl,
                blob,
                { 
                    slug: filename,
                    contentType: contentType,
                    fetch: fetch 
                }
            );
            return getSourceUrl(savedFile);
        } catch (error) {
            if (error.response?.status === 409) {
                // If file exists, overwrite it
                await overwriteFile(
                    fileUrl,
                    blob,
                    { contentType, fetch }
                );
                return fileUrl;
            }
            throw error;
        }
    } catch (error) {
        console.error(`Error saving file ${filename}:`, error);
        throw error;
    }
}

/**
 * Reads a file from the Solid Pod
 * @param {string} fileUrl - The URL of the file to read
 * @param {Function} fetch - The authenticated fetch function
 * @returns {Promise<string>} - The content of the file
 */
export async function readFileFromPod(fileUrl, fetch) {
    try {
        const file = await getFile(fileUrl, { fetch });
        const content = await file.text();
        return content;
    } catch (error) {
        if (error.statusCode === 404) {
            throw new Error(`File not found at ${fileUrl}`);
        }
        console.error(`Error reading file from ${fileUrl}:`, error);
        throw error;
    }
}

/**
 * Deletes a file from the Solid Pod
 * @param {string} fileUrl - The URL of the file to delete
 * @param {Function} fetch - The authenticated fetch function
 * @returns {Promise<void>}
 */
export async function deleteFileFromPod(fileUrl, fetch) {
    try {
        await deleteFile(fileUrl, { fetch });
    } catch (error) {
        if (error.statusCode === 404) {
            // File already doesn't exist, which is fine
            return;
        }
        console.error(`Error deleting file at ${fileUrl}:`, error);
        throw error;
    }
}

/**
 * Lists the contents of a container in the Solid Pod
 * @param {string} containerUrl - The URL of the container
 * @param {Function} fetch - The authenticated fetch function
 * @returns {Promise<string[]>} - Array of resource URLs in the container
 */
export async function listContainerContents(containerUrl, fetch) {
    try {
        const resources = await getContainedResourceUrlAll(containerUrl, { fetch });
        return resources;
    } catch (error) {
        console.error(`Error listing container contents at ${containerUrl}:`, error);
        throw error;
    }
} 