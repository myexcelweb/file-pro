import subprocess
import sys
import re
import webbrowser
import time
import threading
from pathlib import Path

def extract_url_from_line(line):
    """Extract localhost URL from output line"""
    # Look for http://localhost:PORT or http://localhost:PORT/
    url_pattern = r'http://localhost:\d+/?'
    match = re.search(url_pattern, line)
    if match:
        return match.group(0)
    return None

def monitor_output_and_open_browser(process):
    """Monitor subprocess output and open browser when URL is found"""
    url_opened = False
    
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        
        if output:
            line = output.strip()
            print(line)  # Print to console
            
            # Look for URL in the output
            if not url_opened and 'localhost' in line:
                url = extract_url_from_line(line)
                if url:
                    print(f"\n🌐 Found server URL: {url}")
                    print("🚀 Opening Chrome...")
                    
                    try:
                        # Try to open Chrome specifically
                        webbrowser.get('chrome').open(url)
                        print("✅ Chrome opened successfully!")
                    except:
                        # Fallback to default browser
                        webbrowser.open(url)
                        print("✅ Browser opened successfully!")
                    
                    url_opened = True
    
    return process.poll()

def main():
    print("🚀 Starting Dev Server...")
    print("🌐 Chrome will open automatically when server is ready")
    print("⏹️  Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        # Use PowerShell to run npm (works better on Windows)
        cmd = ['powershell', '-Command', 'npm run dev']
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Monitor output and handle browser opening
        exit_code = monitor_output_and_open_browser(process)
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping server...")
        try:
            process.terminate()
        except:
            pass
        exit_code = 0
    except Exception as e:
        print(f"❌ Error: {e}")
        print("💡 Make sure you're in a directory with package.json")
        print("💡 Try running 'npm run dev' manually first to test")
        exit_code = 1
    
    print("\n✅ Server stopped.")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())