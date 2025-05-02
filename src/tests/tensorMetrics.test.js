import { Session } from '@inrupt/solid-client-authn-node';
import { saveFileToPod, readFileFromPod, deleteFileFromPod } from '../utils/solidFileOperations.js';
import { createContainer } from '../utils/solidFileOperations.js';
import { writeFile } from 'fs/promises';

// Configuration
const config = {
    podUrl: 'https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/',
    clientId: 'be132595-972c-4af0-a040-0df87ebca6b8',
    clientSecret: '192fe705-814f-4924-8791-2c5948822f62',
    oidcIssuer: 'https://login.inrupt.com'
};

// Model parameter sizes (number of parameters)
const MODEL_SIZES = {
    small: 1000,      // 1K parameters
    medium: 10000,    // 10K parameters
    large: 100000,    // 100K parameters
    xlarge: 1000000   // 1M parameters
};

class TensorMetricsCollector {
    constructor() {
        this.metrics = {
            modelSizes: {},
            upload: {
                latencies: {},
                transferRates: {}
            },
            download: {
                latencies: {},
                transferRates: {}
            },
            update: {
                latencies: {},
                transferRates: {}
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

    generateModelParameters(numParams) {
        // Generate random model parameters (weights)
        return Array(numParams).fill(0).map(() => Math.random());
    }

    generateModelUpdate(parameters) {
        // Simulate a model update by adding small random changes
        return parameters.map(param => param + (Math.random() * 0.1 - 0.05));
    }

    calculateTransferRate(sizeBytes, timeMs) {
        return (sizeBytes / 1024) / (timeMs / 1000); // KB/s
    }

    async saveToFile(filename = 'tensor_metrics.json') {
        const report = {
            timestamp: new Date().toISOString(),
            ...this.metrics
        };

        try {
            await writeFile(filename, JSON.stringify(report, null, 2));
            console.log(`Metrics report saved to ${filename}`);
        } catch (error) {
            console.error('Error saving metrics report:', error);
        }
    }

    async testModelOperations(session, containerUrl) {
        // First create the container
        console.log('Creating container...');
        await createContainer(config.podUrl, 'test-models/', session.fetch);
        
        for (const [sizeName, numParams] of Object.entries(MODEL_SIZES)) {
            console.log(`\nTesting ${sizeName} model (${numParams} parameters)`);
            
            const filename = `model_${sizeName}.json`;
            const fileUrl = `${containerUrl}${filename}`;
            
            try {
                // Generate initial model parameters
                const parameters = this.generateModelParameters(numParams);
                const parametersStr = JSON.stringify(parameters);
                const sizeBytes = Buffer.from(parametersStr).length;
                
                // Store model size
                this.metrics.modelSizes[sizeName] = {
                    parameters: numParams,
                    sizeBytes: sizeBytes
                };
                
                // Upload model
                console.log(`Uploading ${filename}...`);
                const uploadStart = this.startTimer();
                await saveFileToPod(
                    containerUrl,
                    parametersStr,
                    'application/json',
                    filename,
                    session.fetch
                );
                const uploadTime = this.endTimer(uploadStart);
                this.metrics.upload.latencies[sizeName] = uploadTime;
                this.metrics.upload.transferRates[sizeName] = 
                    this.calculateTransferRate(sizeBytes, uploadTime);
                
                // Download model
                console.log(`Downloading ${filename}...`);
                const downloadStart = this.startTimer();
                await readFileFromPod(fileUrl, session.fetch);
                const downloadTime = this.endTimer(downloadStart);
                this.metrics.download.latencies[sizeName] = downloadTime;
                this.metrics.download.transferRates[sizeName] = 
                    this.calculateTransferRate(sizeBytes, downloadTime);
                
                // Update model
                console.log(`Updating ${filename}...`);
                const updatedParameters = this.generateModelUpdate(parameters);
                const updatedParametersStr = JSON.stringify(updatedParameters);
                const updateStart = this.startTimer();
                await saveFileToPod(
                    containerUrl,
                    updatedParametersStr,
                    'application/json',
                    filename,
                    session.fetch
                );
                const updateTime = this.endTimer(updateStart);
                this.metrics.update.latencies[sizeName] = updateTime;
                this.metrics.update.transferRates[sizeName] = 
                    this.calculateTransferRate(sizeBytes, updateTime);
                
                // Cleanup
                console.log(`Deleting ${filename}...`);
                await deleteFileFromPod(fileUrl, session.fetch);
                
            } catch (error) {
                console.error(`Error processing ${filename}:`, error);
                throw error;
            }
        }
    }

    report() {
        console.log('\n=== Model Parameter Metrics Report ===');
        
        // Model sizes
        console.log('\nModel Sizes:');
        for (const [sizeName, sizeInfo] of Object.entries(this.metrics.modelSizes)) {
            console.log(`\n${sizeName} model:`);
            console.log('Parameters:', sizeInfo.parameters);
            console.log('Size:', (sizeInfo.sizeBytes / 1024).toFixed(2), 'KB');
        }
        
        // Upload metrics
        console.log('\nUpload Metrics:');
        for (const [sizeName, latency] of Object.entries(this.metrics.upload.latencies)) {
            console.log(`\n${sizeName} model:`);
            console.log('Latency:', latency.toFixed(2), 'ms');
            console.log('Transfer Rate:', this.metrics.upload.transferRates[sizeName].toFixed(2), 'KB/s');
        }
        
        // Download metrics
        console.log('\nDownload Metrics:');
        for (const [sizeName, latency] of Object.entries(this.metrics.download.latencies)) {
            console.log(`\n${sizeName} model:`);
            console.log('Latency:', latency.toFixed(2), 'ms');
            console.log('Transfer Rate:', this.metrics.download.transferRates[sizeName].toFixed(2), 'KB/s');
        }
        
        // Update metrics
        console.log('\nUpdate Metrics:');
        for (const [sizeName, latency] of Object.entries(this.metrics.update.latencies)) {
            console.log(`\n${sizeName} model:`);
            console.log('Latency:', latency.toFixed(2), 'ms');
            console.log('Transfer Rate:', this.metrics.update.transferRates[sizeName].toFixed(2), 'KB/s');
        }
        
        // Save to file
        this.saveToFile();
    }
}

async function testTensorOperations() {
    console.log('Starting Model Parameter Operations Test...');
    const metrics = new TensorMetricsCollector();
    const session = new Session();
    const containerPath = 'test-models/';
    const containerUrl = `${config.podUrl}${containerPath}`;

    try {
        // Login to pod
        await session.login({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            oidcIssuer: config.oidcIssuer,
            tokenType: "DPoP",
            grantType: "client_credentials"
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Failed to log in to the Pod");
        }

        console.log('Successfully logged in to the Pod');
        console.log('Session info:', session.info);

        // Run tests
        await metrics.testModelOperations(session, containerUrl);

        // Generate report
        metrics.report();
        
    } catch (error) {
        console.error('Error during Model Parameter Operations Test:', error);
        throw error;
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await session.logout();
    }
}

// Run the test
testTensorOperations().catch(error => {
    console.error('Model Parameter Operations Test failed:', error);
    process.exit(1);
}); 