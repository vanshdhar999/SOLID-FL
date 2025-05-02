import FLServer from '../fl/flServer.js';
import FLClient from '../fl/flClient.js';
import { createContainerInPod } from '../utils/solidFileOperations.js';

// Configuration for server and clients
const config = {
    server: {
        serverClientId: "3cfb7971-bad7-42e2-b448-7910b4008ec9",
        serverClientSecret: "60da740e-6909-4025-8583-d5b41bbc165a",
        serverPodUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverWebId: "https://id.inrupt.com/vanshdhar999"
    },
    client1: {
        clientId: "be132595-972c-4af0-a040-0df87ebca6b8",
        clientSecret: "192fe705-814f-4924-8791-2c5948822f62",
        podUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverPodUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverWebId: "https://id.inrupt.com/vanshdhar999"
    },
    client2: {
        clientId: "be132595-972c-4af0-a040-0df87ebca6b8",
        clientSecret: "192fe705-814f-4924-8791-2c5948822f62",
        podUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverPodUrl: "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        serverWebId: "https://id.inrupt.com/vanshdhar999"
    }
};

async function initializeContainers(session) {
    // Create necessary containers
    await createContainerInPod(config.server.serverPodUrl, 'fl-training/', session.fetch);
    console.log("Created fl-training container in server pod");
}

async function testFLSystem() {
    console.log("Starting Federated Learning System Test...");
    
    try {
        // Initialize server
        console.log("\nInitializing FL Server...");
        const server = new FLServer(config.server);
        await server.initialize();
        
        // Initialize containers
        await initializeContainers(server.session);
        
        // Initialize clients
        console.log("\nInitializing FL Clients...");
        const client1 = new FLClient(config.client1);
        const client2 = new FLClient(config.client2);
        await client1.initialize();
        await client2.initialize();
        
        // Register clients with server
        await server.registerClient(config.client1.podUrl, config.client1.clientId);
        await server.registerClient(config.client2.podUrl, config.client2.clientId);
        
        // Run 5 rounds of federated learning
        for (let round = 0; round < 5; round++) {
            console.log(`\n=== Starting Round ${round + 1} ===`);
            
            // Clients participate in training
            console.log("\nClient 1 training...");
            await client1.participateInRound();
            
            console.log("\nClient 2 training...");
            await client2.participateInRound();
            
            // Server collects and aggregates updates
            console.log("\nServer collecting updates...");
            const updates = await server.collectClientUpdates();
            
            console.log("\nServer aggregating updates...");
            await server.aggregateUpdates(updates);
            
            console.log(`\n=== Completed Round ${round + 1} ===`);
        }
        
        // Cleanup
        console.log("\nShutting down system...");
        await client1.shutdown();
        await client2.shutdown();
        await server.shutdown();
        
        console.log("\nFederated Learning System Test completed successfully!");
        
    } catch (error) {
        console.error("Error in FL System Test:", error);
        throw error;
    }
}

// Run the test
testFLSystem().catch(error => {
    console.error("FL System Test failed:", error);
    process.exit(1);
}); 