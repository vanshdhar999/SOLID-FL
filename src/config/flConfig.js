// FL System Configuration

// Server Configuration
export const SERVER_CONFIG = {
    CLIENT_ID: process.env.SERVER_CLIENT_ID || "3cfb7971-bad7-42e2-b448-7910b4008ec9",
    CLIENT_SECRET: process.env.SERVER_CLIENT_SECRET || "60da740e-6909-4025-8583-d5b41bbc165a",
    POD_URL: process.env.SERVER_POD_URL || "https://storage.ap.inrupt.com/e259ad49-19b1-415f-836b-6f704fc67ec8/",
    CONTAINER: "fl-server/"
};

// Client Configurations
export const CLIENT_CONFIG = [
    {
        CLIENT_ID: process.env.CLIENT1_CLIENT_ID || "be132595-972c-4af0-a040-0df87ebca6b8",
        CLIENT_SECRET: process.env.CLIENT1_CLIENT_SECRET || "192fe705-814f-4924-8791-2c5948822f62",
        POD_URL: process.env.CLIENT1_POD_URL || "https://storage.inrupt.com/a3d8a247-79d5-45f0-b78c-c5b059375215/",
        CONTAINER: "fl-client1/",
        TRAINING_DATA_URL: "training-data/client1_data.csv"
    },
    {
        CLIENT_ID: process.env.CLIENT2_CLIENT_ID || "65d6a5f1-6998-4518-b048-7caa7b79a893",
        CLIENT_SECRET: process.env.CLIENT2_CLIENT_SECRET || "e94f0702-112d-46cd-8689-02ae3adcffff",
        POD_URL: process.env.CLIENT2_POD_URL || "https://storage.ap.inrupt.com/dd6cd4bc-f5c8-4da0-93a7-28a84df7edbd/",
        CONTAINER: "fl-client2/",
        TRAINING_DATA_URL: "training-data/client2_data.csv"
    }
];

// Training Configuration
export const TRAINING_CONFIG = {
    ROUNDS: 5,
    EPOCHS: 10,
    BATCH_SIZE: 32,
    LEARNING_RATE: 0.01
}; 