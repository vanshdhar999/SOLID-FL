import FLServer from './fl/flServer.js';
import FLClient from './fl/flClient.js';
import { saveFileToPod } from './utils/solidFileOperations.js';

// Configuration for server and clients
const config = {
    server: {
        serverClientId: "3cfb7971-bad7-42e2-b448-7910b4008ec9",
        serverClientSecret: "60da740e-6909-4025-8583-d5b41bbc165a",
        serverPodUrl: "https://storage.ap.inrupt.com/e259ad49-19b1-415f-836b-6f704fc67ec8/",
        serverWebId: "https://id.inrupt.com/vanshdhar999"
    },
    client1: {
        clientId: "be132595-972c-4af0-a040-0df87ebca6b8",
        clientSecret: "192fe705-814f-4924-8791-2c5948822f62",
        podUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverPodUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverWebId: "https://id.inrupt.com/pinakinpod"
    }
};

async function uploadTrainingData(client) {
    try {
        // Read the training data file
        const fs = await import('fs/promises');
        const trainingData = await fs.readFile('./src/data/training_data.csv', 'utf8');
        
        // Upload to client's pod
        await saveFileToPod(
            client.config.podUrl + 'fl-training/',
            trainingData,
            'text/csv',
            'training_data.csv',
            client.session.fetch
        );
        console.log('Training data uploaded successfully');
    } catch (error) {
        console.error('Error uploading training data:', error);
        throw error;
    }
}

async function runFLSystem() {
    console.log("Starting Federated Learning System...");
    
    try {
        // Initialize server
        console.log("\nInitializing FL Server...");
        const server = new FLServer(config.server);
        await server.initialize();
        
        // Initialize client
        console.log("\nInitializing FL Client...");
        const client = new FLClient(config.client1);
        await client.initialize();
        
        // Register client with server
        await server.registerClient(client.config.podUrl, client.config.clientId);
        
        // Upload training data
        console.log("\nUploading training data...");
        await uploadTrainingData(client);
        
        // Run 5 rounds of federated learning
        for (let round = 0; round < 5; round++) {
            console.log(`\n=== Starting Round ${round + 1} ===`);
            
            // Client participates in training
            console.log("\nClient training...");
            await client.participateInRound();
            
            // Server collects and aggregates updates
            console.log("\nServer collecting updates...");
            const updates = await server.collectClientUpdates();
            
            console.log("\nServer aggregating updates...");
            await server.aggregateUpdates(updates);
            
            console.log(`\n=== Completed Round ${round + 1} ===`);
        }
        
        // Cleanup
        console.log("\nShutting down system...");
        await client.shutdown();
        await server.shutdown();
        
        console.log("\nFederated Learning System completed successfully!");
        
    } catch (error) {
        console.error("Error in FL System:", error);
        process.exit(1);
    }
}

// Run the system
runFLSystem().catch(error => {
    console.error("FL System failed:", error);
    process.exit(1);
}); 