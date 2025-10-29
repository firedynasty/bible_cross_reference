#!/usr/bin/env python3
"""
Script to remove asterisks from formatted Bible chapter references.
Reads from clipboard, processes, and writes back to clipboard.
"""
import re
import sys

def remove_asterisks(text):
    """
    Remove asterisks from chapter references.
    
    Args:
        text (str): Input text with asterisks
        
    Returns:
        str: Text with asterisks removed
    """
    # Pattern to match **Chapter X**: and replace with Chapter X:
    pattern = r'\*\*Chapter\s+(\d+)\*\*:'
    cleaned = re.sub(pattern, r'Chapter \1:', text)
    
    # Remove any remaining standalone asterisks
    cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)
    
    return cleaned

def main():
    try:
        import pyperclip
    except ImportError:
        print("Error: pyperclip module not found")
        print("Install it with: pip install pyperclip")
        sys.exit(1)
    
    try:
        # Get text from clipboard
        text = pyperclip.paste()
        
        if not text:
            print("Clipboard is empty!")
            sys.exit(1)
        
        # Process the text
        cleaned = remove_asterisks(text)
        
        # Copy back to clipboard
        pyperclip.copy(cleaned)
        
        print("✓ Processed text copied to clipboard!")
        print(f"\nOriginal had {text.count('**')} asterisks")
        print(f"Cleaned version has {cleaned.count('**')} asterisks")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
