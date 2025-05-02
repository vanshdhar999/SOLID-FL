import torch
import torch.nn as nn
import torch.optim as optim
import json
import pandas as pd
import numpy as np

class FederatedClient:
    def __init__(self):
        self.model = SimpleModel()
        self.criterion = nn.BCELoss()
        self.optimizer = optim.SGD(self.model.parameters(), lr=0.01)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        
    def prepare_data(self, csv_data):
        # Convert CSV string to DataFrame
        df = pd.read_csv(pd.StringIO(csv_data))
        features = df.iloc[:, :-1].values
        labels = df.iloc[:, -1].values
        
        # Convert to PyTorch tensors
        features = torch.FloatTensor(features).to(self.device)
        labels = torch.FloatTensor(labels).to(self.device)
        
        return features, labels
        
    def train(self, global_model_json, features, labels):
        # Update local model with global model
        state_dict = json.loads(global_model_json)
        state_dict = {k: torch.tensor(v) for k, v in state_dict.items()}
        self.model.load_state_dict(state_dict)
        
        # Training loop
        self.model.train()
        for epoch in range(10):
            self.optimizer.zero_grad()
            outputs = self.model(features)
            loss = self.criterion(outputs.squeeze(), labels)
            loss.backward()
            self.optimizer.step()
            
        # Convert model state to JSON
        model_state = {
            k: v.tolist() for k, v in self.model.state_dict().items()
        }
        return json.dumps(model_state) 