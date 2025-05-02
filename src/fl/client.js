import { Session } from '@inrupt/solid-client-authn-node';
import { saveFileToPod, readFileFromPod } from '../utils/solidFileOperations.js';
import { readTrainingData } from '../utils/trainingDataOperations.js';
import { spawn } from 'child_process';
import { CLIENT_CONFIG } from '../config/flConfig.js';

class FLClient {
    constructor(clientId, clientSecret, podUrl) {
        this.session = new Session();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.podUrl = podUrl;
        this.container = `${podUrl}${CLIENT_CONFIG.CONTAINER}`;
        this.pythonProcess = spawn('python3', ['src/fl/fl_client.py']);
        
        // Handle Python process errors
        this.pythonProcess.stderr.on('data', (data) => {
            console.error('Python process error:', data.toString());
        });
    }

    async initialize() {
        try {
            await this.session.login({
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                oidcIssuer: "https://login.inrupt.com",
                tokenType: "DPoP",
                grantType: "client_credentials"
            });

            if (!this.session.info.isLoggedIn) {
                throw new Error("Failed to log in to the Client Pod");
            }
            console.log('Client successfully authenticated');
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    async loadTrainingData(dataUrl) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for data preparation'));
            }, 5000);

            this.pythonProcess.stdout.once('data', (data) => {
                clearTimeout(timeout);
                resolve(data.toString().trim());
            });

            this.pythonProcess.stderr.once('data', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.toString()));
            });

            this.pythonProcess.stdin.write(JSON.stringify({
                type: 'prepare_data',
                data_url: dataUrl
            }) + '\n');
        });
    }

    async trainModel(globalModel) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for model training'));
            }, 5000);

            this.pythonProcess.stdout.once('data', (data) => {
                clearTimeout(timeout);
                resolve(data.toString().trim());
            });

            this.pythonProcess.stderr.once('data', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.toString()));
            });

            this.pythonProcess.stdin.write(JSON.stringify({
                type: 'train',
                global_model: globalModel
            }) + '\n');
        });
    }

    async saveModel(modelState) {
        const modelPath = `${this.container}local_model.json`;
        await saveFileToPod(
            this.container,
            modelState,
            'application/json',
            'local_model.json',
            this.session.fetch
        );
        return modelPath;
    }

    async getModel() {
        const modelPath = `${this.container}local_model.json`;
        return await readFileFromPod(modelPath, this.session.fetch);
    }

    async stop() {
        this.pythonProcess.kill();
        await this.session.logout();
    }
}

export { FLClient }; 