import { Session } from '@inrupt/solid-client-authn-node';
import { writeFile } from 'fs/promises';
import { saveFileToPod, readFileFromPod, deleteFileFromPod } from '../utils/solidFileOperations.js';

// Configuration
const config = {
    podUrl: 'https://storage.ap.inrupt.com/dd6cd4bc-f5c8-4da0-93a7-28a84df7edbd/',
    clientId: '65d6a5f1-6998-4518-b048-7caa7b79a893',
    clientSecret: 'e94f0702-112d-46cd-8689-02ae3adcffff',
    oidcIssuer: 'https://login.inrupt.com'
};

// File sizes in KB
const FILE_SIZES = {
    small: 10,    // 10 KB
    medium: 100,  // 100 KB
    large: 1000,  // 1 MB
    xlarge: 5000  // 5 MB
};

// Tensor sizes (number of parameters)
const TENSOR_SIZES = {
    small: 1000,      // 1K parameters
    medium: 10000,    // 10K parameters
    large: 100000,    // 100K parameters
    xlarge: 1000000   // 1M parameters
};

class LargeFileMetricsCollector {
    constructor() {
        this.metrics = {
            fileOperations: {
                fileSizes: {},
                create: {},
                read: {},
                update: {},
                delete: {}
            },
            tensorOperations: {
                sizes: {},
                upload: {},
                download: {},
                update: {}
            }
        };
    }

    startTimer() {
        return process.hrtime();
    }

    endTimer(startTime) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    }

    generateRandomData(sizeKB) {
        const size = sizeKB * 1024; // Convert KB to bytes
        return 'A'.repeat(size);
    }

    generateTensorData(numParams) {
        // Generate random tensor data
        const tensor = Array(numParams).fill(0).map(() => Math.random());
        return JSON.stringify(tensor);
    }

    async saveToFile(data, filename = 'large_file_metrics.json') {
        try {
            await writeFile(filename, JSON.stringify(data, null, 2));
            console.log(`Metrics saved to ${filename}`);
        } catch (error) {
            console.error('Error saving metrics:', error);
        }
    }

    async testFileOperations(session) {
        const fileTypes = ['csv', 'json', 'txt'];
        
        for (const [sizeName, sizeKB] of Object.entries(FILE_SIZES)) {
            console.log(`\nTesting ${sizeName} files (${sizeKB} KB)`);
            
            for (const fileType of fileTypes) {
                const filename = `test_${sizeName}_${fileType}.${fileType}`;
                const fileUrl = `${config.podUrl}${filename}`;
                const data = this.generateRandomData(sizeKB);
                
                try {
                    // Store file size
                    this.metrics.fileOperations.fileSizes[`${sizeName}_${fileType}`] = sizeKB * 1024;
                    
                    // Create
                    console.log(`Creating ${filename}...`);
                    const createStart = this.startTimer();
                    await saveFileToPod(fileUrl, data, session.fetch);
                    this.metrics.fileOperations.create[`${sizeName}_${fileType}`] = this.endTimer(createStart);
                    
                    // Read
                    console.log(`Reading ${filename}...`);
                    const readStart = this.startTimer();
                    await readFileFromPod(fileUrl, session.fetch);
                    this.metrics.fileOperations.read[`${sizeName}_${fileType}`] = this.endTimer(readStart);
                    
                    // Update
                    console.log(`Updating ${filename}...`);
                    const updateStart = this.startTimer();
                    await saveFileToPod(fileUrl, data + 'updated', session.fetch);
                    this.metrics.fileOperations.update[`${sizeName}_${fileType}`] = this.endTimer(updateStart);
                    
                    // Delete
                    console.log(`Deleting ${filename}...`);
                    const deleteStart = this.startTimer();
                    await deleteFileFromPod(fileUrl, session.fetch);
                    this.metrics.fileOperations.delete[`${sizeName}_${fileType}`] = this.endTimer(deleteStart);
                } catch (error) {
                    console.error(`Error processing ${filename}:`, error);
                    throw error;
                }
            }
        }
    }

    async testTensorOperations(session) {
        for (const [sizeName, numParams] of Object.entries(TENSOR_SIZES)) {
            console.log(`\nTesting ${sizeName} tensor (${numParams} parameters)`);
            
            const filename = `tensor_${sizeName}.json`;
            const fileUrl = `${config.podUrl}${filename}`;
            const tensorData = this.generateTensorData(numParams);
            
            try {
                // Store tensor size
                this.metrics.tensorOperations.sizes[`${sizeName}`] = numParams;
                
                // Upload
                console.log(`Uploading ${filename}...`);
                const uploadStart = this.startTimer();
                await saveFileToPod(fileUrl, tensorData, session.fetch);
                this.metrics.tensorOperations.upload[`${sizeName}`] = this.endTimer(uploadStart);
                
                // Download
                console.log(`Downloading ${filename}...`);
                const downloadStart = this.startTimer();
                await readFileFromPod(fileUrl, session.fetch);
                this.metrics.tensorOperations.download[`${sizeName}`] = this.endTimer(downloadStart);
                
                // Update
                console.log(`Updating ${filename}...`);
                const updateStart = this.startTimer();
                const updatedTensor = JSON.parse(tensorData).map(x => x + 0.1);
                await saveFileToPod(fileUrl, JSON.stringify(updatedTensor), session.fetch);
                this.metrics.tensorOperations.update[`${sizeName}`] = this.endTimer(updateStart);
                
                // Cleanup
                console.log(`Deleting ${filename}...`);
                await deleteFileFromPod(fileUrl, session.fetch);
            } catch (error) {
                console.error(`Error processing ${filename}:`, error);
                throw error;
            }
        }
    }

    async runTests(session) {
        try {
            console.log('Starting large file and tensor operations test...');
            
            await this.testFileOperations(session);
            await this.testTensorOperations(session);
            
            // Save metrics
            await this.saveToFile({
                timestamp: new Date().toISOString(),
                ...this.metrics
            });
            
            console.log('\nTest completed successfully!');
        } catch (error) {
            console.error('Error during test:', error);
            throw error;
        }
    }
}

async function runLargeFileTest() {
    console.log('Starting Large File Metrics Test...');
    const collector = new LargeFileMetricsCollector();
    const session = new Session();

    try {
        // Login to pod with proper authentication
        await session.login({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            oidcIssuer: config.oidcIssuer,
            tokenType: "DPoP",
            grantType: "client_credentials",
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Failed to log in to the Pod");
        }

        console.log('Successfully logged in to the Pod');
        console.log('Session info:', session.info);

        // Run tests
        await collector.runTests(session);
        
    } catch (error) {
        console.error('Error during Large File Metrics Test:', error);
        throw error;
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await session.logout();
    }
}

// Run the test
runLargeFileTest().catch(error => {
    console.error('Large File Metrics Test failed:', error);
    process.exit(1);
}); 