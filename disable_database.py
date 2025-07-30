#!/usr/bin/env python3
"""
Script to disable automatic MongoDB connection in the application.
This creates a .env file with DISABLE_DATABASE=true
"""
import os

def disable_database():
    """Disable automatic database connection by setting environment variable"""
    print("Disabling automatic MongoDB connection...")
    
    # Path to the backend directory where .env should be
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    env_file_path = os.path.join(backend_dir, '.env')
    
    # Read existing .env file if it exists
    env_content = {}
    if os.path.exists(env_file_path):
        with open(env_file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_content[key.strip()] = value.strip()
    
    # Set the disable database flag
    env_content['DISABLE_DATABASE'] = 'true'
    
    # Write back to .env file
    with open(env_file_path, 'w') as f:
        for key, value in env_content.items():
            f.write(f"{key}={value}\n")
    
    print(f"Database connection disabled successfully!")
    print(f"Created/updated .env file at: {env_file_path}")
    print("The application will now skip MongoDB connection attempts.")
    print("Data will be saved to CSV files only.")
    print("\nTo re-enable database, either:")
    print("1. Remove the DISABLE_DATABASE line from .env file")
    print("2. Set DISABLE_DATABASE=false in .env file")

def enable_database():
    """Enable automatic database connection by removing/setting environment variable"""
    print("Enabling automatic MongoDB connection...")
    
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    env_file_path = os.path.join(backend_dir, '.env')
    
    if os.path.exists(env_file_path):
        # Read existing .env file
        env_content = {}
        with open(env_file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_content[key.strip()] = value.strip()
        
        # Remove or set the disable database flag
        if 'DISABLE_DATABASE' in env_content:
            del env_content['DISABLE_DATABASE']
        
        # Write back to .env file
        with open(env_file_path, 'w') as f:
            for key, value in env_content.items():
                f.write(f"{key}={value}\n")
        
        print("Database connection enabled successfully!")
    else:
        print("No .env file found - database connection is enabled by default")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "enable":
        enable_database()
    else:
        disable_database()
