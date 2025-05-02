import { Session } from '@inrupt/solid-client-authn-node';
import { saveFileToPod, readFileFromPod, deleteFileFromPod } from '../utils/solidFileOperations.js';
import { createContainer } from '../utils/solidFileOperations.js';

// Sample data for different file types
const sampleData = {
    csv: `id,name,age
1,John,30
2,Jane,25
3,Bob,35`,
    json: JSON.stringify({
        users: [
            { id: 1, name: "John", age: 30 },
            { id: 2, name: "Jane", age: 25 },
            { id: 3, name: "Bob", age: 35 }
        ]
    }, null, 2),
    txt: `This is a sample text file.
It contains multiple lines of text.
Each line has different content.
This is the last line.`
};

class CrudMetricsCollector {
    constructor() {
        this.metrics = {
            create: {
                csv: [],
                json: [],
                txt: []
            },
            read: {
                csv: [],
                json: [],
                txt: []
            },
            update: {
                csv: [],
                json: [],
                txt: []
            },
            delete: {
                csv: [],
                json: [],
                txt: []
            },
            fileSizes: {
                csv: Buffer.from(sampleData.csv).length,
                json: Buffer.from(sampleData.json).length,
                txt: Buffer.from(sampleData.txt).length
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

    addMetric(operation, fileType, value) {
        this.metrics[operation][fileType].push(value);
    }

    calculateStats(values) {
        if (values.length === 0) return { min: 0, max: 0, avg: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: sum / values.length
        };
    }

    report() {
        console.log('\n=== CRUD Operation Metrics Report ===');
        
        // File sizes
        console.log('\nFile Sizes (bytes):');
        console.log('CSV:', this.metrics.fileSizes.csv);
        console.log('JSON:', this.metrics.fileSizes.json);
        console.log('TXT:', this.metrics.fileSizes.txt);

        // Create operations
        console.log('\nCreate Operation Latencies (ms):');
        const createCsv = this.calculateStats(this.metrics.create.csv);
        const createJson = this.calculateStats(this.metrics.create.json);
        const createTxt = this.calculateStats(this.metrics.create.txt);
        console.log('CSV Create:', createCsv);
        console.log('JSON Create:', createJson);
        console.log('TXT Create:', createTxt);

        // Read operations
        console.log('\nRead Operation Latencies (ms):');
        const readCsv = this.calculateStats(this.metrics.read.csv);
        const readJson = this.calculateStats(this.metrics.read.json);
        const readTxt = this.calculateStats(this.metrics.read.txt);
        console.log('CSV Read:', readCsv);
        console.log('JSON Read:', readJson);
        console.log('TXT Read:', readTxt);

        // Update operations
        console.log('\nUpdate Operation Latencies (ms):');
        const updateCsv = this.calculateStats(this.metrics.update.csv);
        const updateJson = this.calculateStats(this.metrics.update.json);
        const updateTxt = this.calculateStats(this.metrics.update.txt);
        console.log('CSV Update:', updateCsv);
        console.log('JSON Update:', updateJson);
        console.log('TXT Update:', updateTxt);

        // Delete operations
        console.log('\nDelete Operation Latencies (ms):');
        const deleteCsv = this.calculateStats(this.metrics.delete.csv);
        const deleteJson = this.calculateStats(this.metrics.delete.json);
        const deleteTxt = this.calculateStats(this.metrics.delete.txt);
        console.log('CSV Delete:', deleteCsv);
        console.log('JSON Delete:', deleteJson);
        console.log('TXT Delete:', deleteTxt);

        // Calculate transfer rates
        console.log('\nTransfer Rates (KB/s):');
        const calculateTransferRate = (size, time) => (size / 1024) / (time / 1000);
        
        console.log('CSV Transfer Rate:', {
            create: calculateTransferRate(this.metrics.fileSizes.csv, createCsv.avg),
            read: calculateTransferRate(this.metrics.fileSizes.csv, readCsv.avg)
        });
        console.log('JSON Transfer Rate:', {
            create: calculateTransferRate(this.metrics.fileSizes.json, createJson.avg),
            read: calculateTransferRate(this.metrics.fileSizes.json, readJson.avg)
        });
        console.log('TXT Transfer Rate:', {
            create: calculateTransferRate(this.metrics.fileSizes.txt, createTxt.avg),
            read: calculateTransferRate(this.metrics.fileSizes.txt, readTxt.avg)
        });
    }
}

async function testPodCrudOperations() {
    console.log('Starting Pod CRUD Operations Test...');
    const metrics = new CrudMetricsCollector();
    const session = new Session();
    const podUrl = 'https://storage.ap.inrupt.com/dd6cd4bc-f5c8-4da0-93a7-28a84df7edbd/';
    const containerPath = 'test-metrics/';
    const containerUrl = `${podUrl}${containerPath}`;

    try {
        // Login to pod
        await session.login({
            clientId: '65d6a5f1-6998-4518-b048-7caa7b79a893',
            clientSecret: 'e94f0702-112d-46cd-8689-02ae3adcffff',
            oidcIssuer: "https://login.inrupt.com",
            tokenType: "DPoP",
            grantType: "client_credentials"
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Failed to log in to the Pod");
        }

        // Create test container
        await createContainer(podUrl, containerPath, session.fetch);

        // Test each file type
        const fileTypes = ['csv', 'json', 'txt'];
        const numOperations = 5; // Number of operations to perform for each file type

        for (const fileType of fileTypes) {
            console.log(`\nTesting ${fileType.toUpperCase()} operations...`);
            
            for (let i = 0; i < numOperations; i++) {
                const fileName = `test_${fileType}_${i}.${fileType}`;
                const fileUrl = `${containerUrl}${fileName}`;
                
                // Create operation
                const createStart = metrics.startTimer();
                await saveFileToPod(
                    containerUrl,
                    sampleData[fileType],
                    `text/${fileType === 'json' ? 'json' : fileType === 'csv' ? 'csv' : 'plain'}`,
                    fileName,
                    session.fetch
                );
                metrics.addMetric('create', fileType, metrics.endTimer(createStart));

                // Read operation
                const readStart = metrics.startTimer();
                await readFileFromPod(fileUrl, session.fetch);
                metrics.addMetric('read', fileType, metrics.endTimer(readStart));

                // Update operation
                const updateStart = metrics.startTimer();
                await saveFileToPod(
                    containerUrl,
                    sampleData[fileType],
                    `text/${fileType === 'json' ? 'json' : fileType === 'csv' ? 'csv' : 'plain'}`,
                    fileName,
                    session.fetch
                );
                metrics.addMetric('update', fileType, metrics.endTimer(updateStart));

                // Delete operation
                const deleteStart = metrics.startTimer();
                await deleteFileFromPod(fileUrl, session.fetch);
                metrics.addMetric('delete', fileType, metrics.endTimer(deleteStart));
            }
        }

        console.log('\nCRUD Operations Test completed successfully!');
        metrics.report();
    } catch (error) {
        console.error('Error during CRUD Operations Test:', error);
        throw error;
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await session.logout();
    }
}

// Run the test
testPodCrudOperations().catch(error => {
    console.error('CRUD Operations Test failed:', error);
    process.exit(1);
}); 