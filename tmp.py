import os
import zipfile
from pathlib import Path

def create_project_zip():
    # Output zip file name
    zip_filename = "reminderApp - share.zip"
    
    # Get the current working directory
    base_dir = os.getcwd()
    
    # Create a new zip file
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add files from root directory
        for item in os.listdir(base_dir):
            if item == zip_filename:  # Skip the zip file itself
                continue
                
            if os.path.isfile(item):  # Add files only
                zipf.write(item, item)
        
        # Add src directory and its contents
        src_dir = os.path.join(base_dir, 'src')
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Calculate relative path for the zip structure
                rel_path = os.path.relpath(file_path, base_dir)
                zipf.write(file_path, rel_path)
    
    print(f"Zip file '{zip_filename}' created successfully!")

if __name__ == "__main__":
    create_project_zip()
