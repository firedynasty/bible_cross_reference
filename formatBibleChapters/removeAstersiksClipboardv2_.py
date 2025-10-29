#!/usr/bin/env python3
"""
Script to remove asterisks from formatted Bible chapter references
and remove blank lines between chapters.
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

def remove_blank_lines_between_chapters(text):
    """
    Remove blank lines between chapter entries.
    
    Args:
        text (str): Input text
        
    Returns:
        str: Text with blank lines removed between chapters
    """
    # Replace multiple newlines (blank lines) with single newlines
    # This will condense blank lines between chapters
    cleaned = re.sub(r'\n\n+', r'\n', text)
    
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
        cleaned = remove_blank_lines_between_chapters(cleaned)
        
        # Copy back to clipboard
        pyperclip.copy(cleaned)
        
        print("✓ Processed text copied to clipboard!")
        print(f"\nOriginal had {text.count('**')} asterisks")
        print(f"Cleaned version has {cleaned.count('**')} asterisks")
        print(f"Removed {text.count(chr(10)) - cleaned.count(chr(10))} blank lines")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
