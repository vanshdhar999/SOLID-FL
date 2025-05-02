import { Session } from '@inrupt/solid-client-authn-node';
import { readFileFromPod, saveFileToPod, createContainerInPod } from '../utils/solidFileOperations.js';

class FLClient {
    constructor(config) {
        this.session = new Session();
        this.config = config;
        this.localModel = null;
        this.roundNumber = 0;
        this.trainingContainer = 'fl-training/';
    }

    async initialize() {
        try {
            // First, ensure we're logged out
            if (this.session.info.isLoggedIn) {
                await this.session.logout();
            }

            // Login with proper configuration
            await this.session.login({
                clientId: this.config.clientId,
                clientSecret: this.config.clientSecret,
                oidcIssuer: "https://login.inrupt.com",
                tokenType: "DPoP",
                grantType: "client_credentials",
                redirectUrl: "http://localhost:3000/callback"
            });

            if (!this.session.info.isLoggedIn) {
                throw new Error("Client failed to log in");
            }

            console.log("Client logged in successfully");

            // Initialize training container
            const containerUrl = await createContainerInPod(
                this.config.podUrl,
                this.trainingContainer,
                this.session.fetch
            );
            console.log("Training container created at:", containerUrl);

            console.log("FL Client initialized successfully");
        } catch (error) {
            console.error("Error initializing FL client:", error);
            throw error;
        }
    }

    // Step 2: Access raw data from pod
    async loadTrainingData() {
        try {
            const dataPath = `${this.config.podUrl}${this.trainingContainer}training_data.csv`;
            const data = await readFileFromPod(dataPath, this.session.fetch);
            console.log("Training data loaded successfully");
            return data;
        } catch (error) {
            if (error.message.includes('not found')) {
                console.error("Training data file not found. Please ensure training_data.csv exists in the fl-training container.");
            }
            throw error;
        }
    }

    // Step 3: Save gradients/weights to pod
    async saveLocalModel() {
        try {
            const modelPath = `${this.config.podUrl}${this.trainingContainer}`;
            await saveFileToPod(
                modelPath,
                JSON.stringify(this.localModel),
                'application/json',
                `local_model_${this.roundNumber}.json`,
                this.session.fetch
            );
            console.log("Local model saved successfully");
        } catch (error) {
            console.error("Error saving local model:", error);
            throw error;
        }
    }

    // Step 4: Authorize server to access gradients and weights
    async authorizeServer(serverWebId) {
        // In a real implementation, this would set up proper ACL/WAC permissions
        console.log(`Authorized server ${serverWebId} to access model updates`);
    }

    // Training step - simplified for demonstration
    async trainLocalModel(data) {
        try {
            // Simplified training logic - in reality, this would use a proper ML framework
            this.localModel = {
                weights: Array(10).fill(0).map(() => Math.random()),
                bias: Math.random(),
                round: this.roundNumber
            };
            
            await this.saveLocalModel();
            console.log("Local training completed - Round", this.roundNumber);
        } catch (error) {
            console.error("Error in local training:", error);
            throw error;
        }
    }

    async fetchGlobalModel() {
        try {
            const modelPath = `${this.config.serverPodUrl}${this.trainingContainer}global_model_${this.roundNumber}.json`;
            const modelData = await readFileFromPod(modelPath, this.session.fetch);
            return JSON.parse(modelData);
        } catch (error) {
            if (error.message.includes('not found')) {
                console.error("Global model not found for round", this.roundNumber);
            }
            throw error;
        }
    }

    async participateInRound() {
        try {
            // Load training data
            const data = await this.loadTrainingData();
            
            // Train local model
            await this.trainLocalModel(data);
            
            // Authorize server to access updates
            await this.authorizeServer(this.config.serverWebId);
            
            // Increment round number
            this.roundNumber++;
            
            console.log("Completed training round", this.roundNumber);
        } catch (error) {
            console.error("Error in training round:", error);
            throw error;
        }
    }

    async shutdown() {
        try {
            await this.session.logout();
            console.log("FL Client shut down");
        } catch (error) {
            console.error("Error shutting down client:", error);
            throw error;
        }
    }
}

export default FLClient; 