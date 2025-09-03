"""
Caltech Course Catalog Parser
Converts catalog_uncleaned.txt directly to structured JSON format for the browser extension.
Combines cleaning and parsing functionality into a single, production-ready script.

@author: Varun Rodrigues
@version: 2.0
@date: 2025
"""

import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration constants
PAGE_NUMBER_THRESHOLD = 500

# Department headers to remove (only if they appear alone on a line)
DEPARTMENT_HEADERS: Set[str] = {
    "AEROSPACE", "ANTHROPOLOGY", "APPLIED AND COMPUTATIONAL MATH", "APPLIED & COMPUTATIONAL MATH",
    "APPLIED MECHANICS", "APPLIED PHYSICS", "ASTROPHYSICS", 
    "BIOCHEMISTRY AND MOLECULAR BIOPHYSICS", "BIOCHEMISTRY & MOLECULAR BIOPHYSICS",
    "BIOENGINEERING", "BIOLOGY", 
    "BUSINESS ECONOMICS AND MANAGEMENT", "BUSINESS ECONOMICS & MANAGEMENT",
    "CHEMICAL ENGINEERING", "CHEMISTRY", 
    "CIVIL ENGINEERING", "COMPUTATION AND NEURAL SYSTEMS", "COMPUTATION & NEURAL SYSTEMS",
    "COMPUTER SCIENCE", 
    "COMPUTING AND MATHEMATICAL SCIENCES", "COMPUTING & MATHEMATICAL SCIENCES",
    "CONTROL AND DYNAMICAL SYSTEMS", "CONTROL & DYNAMICAL SYSTEMS",
    "ECONOMICS", "ELECTRICAL ENGINEERING", "ENERGY SCIENCE AND TECHNOLOGY", "ENERGY SCIENCE & TECHNOLOGY",
    "ENGINEERING", "ENGLISH", "ENGLISH AS A SECOND LANGUAGE", 
    "ENVIRONMENTAL SCIENCE AND ENGINEERING", "ENVIRONMENTAL SCIENCE & ENGINEERING",
    "FIRST-YEAR SEMINARS", 
    "GEOLOGY", "HISTORY", "HISTORY AND PHILOSOPHY OF SCIENCE", "HISTORY & PHILOSOPHY OF SCIENCE",
    "HUMANITIES", 
    "INFORMATION AND DATA SCIENCES", "INFORMATION & DATA SCIENCES",
    "INFORMATION SCIENCE AND TECHNOLOGY", "INFORMATION SCIENCE & TECHNOLOGY",
    "LANGUAGES", "LAW", "MATERIALS SCIENCE", "MATHEMATICS", 
    "MECHANICAL ENGINEERING", "MEDICAL ENGINEERING", "MUSIC", "NEUROBIOLOGY", 
    "PERFORMING AND VISUAL ARTS", "PERFORMING & VISUAL ARTS",
    "PHILOSOPHY", "PHYSICAL EDUCATION", 
    "PHYSICS", "POLITICAL SCIENCE", "PSYCHOLOGY", 
    "SCIENTIFIC AND ENGINEERING COMMUNICATION", "SCIENTIFIC & ENGINEERING COMMUNICATION",
    "SOCIAL SCIENCE", 
    "STUDENT ACTIVITIES", "VISUAL CULTURE", "WRITING"
}

# Page number threshold (numbers above this are considered page numbers)
PAGE_NUMBER_THRESHOLD = 500

# Department names for course validation (reusing headers for consistency)
DEPARTMENT_NAMES = list(DEPARTMENT_HEADERS)

# Regular expression patterns for course parsing
COURSE_CODE_PATTERNS = [
    # Pattern 1: Standard single department with one number
    r'^([A-Z][a-zA-Z]{1,4})\s+(\d{1,3})\s*([a-z]*)\.',
    
    # Pattern 2: Cross-listed departments with one number  
    r'^([A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})+)\s+(\d{1,3})\s*([a-z]*)\.',
    
    # Pattern 3: Single department with multiple numbers
    r'^([A-Z][a-zA-Z]{1,4})\s+(\d{1,3}/\d{1,3})\s*([a-z]*)\.',
    
    # Pattern 4: Cross-listed departments with multiple numbers
    r'^([A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})+)\s+(\d{1,3}/\d{1,3})\s*([a-z]*)\.'
]


def is_department_header(line: str) -> bool:
    """Check if a line contains only a department header."""
    return line.upper() in DEPARTMENT_HEADERS


def is_multiline_department_header(lines: List[str], start_index: int) -> int:
    """
    Check if consecutive lines starting at start_index form a department header.
    Returns the number of lines that form the header, or 0 if no match.
    """
    if start_index >= len(lines):
        return 0
    
    # Try combinations of 2-3 consecutive lines
    for num_lines in range(2, min(4, len(lines) - start_index + 1)):
        # Combine the lines with a space
        combined_lines = []
        for i in range(num_lines):
            line = lines[start_index + i].strip()
            if not line:  # Skip empty lines
                break
            combined_lines.append(line)
        
        if len(combined_lines) == num_lines:
            combined_header = " ".join(combined_lines).upper()
            if combined_header in DEPARTMENT_HEADERS:
                return num_lines
    
    return 0


def is_page_number(line: str) -> bool:
    """Check if a line contains only a page number above the threshold."""
    return line.isdigit() and int(line) > PAGE_NUMBER_THRESHOLD


def clean_catalog_text(lines: List[str]) -> List[str]:
    """Remove department headers and page numbers from catalog lines."""
    result = []
    i = 0
    removed_count = {"single": 0, "multi": 0, "pages": 0}
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Check for single-line department headers first
        if is_department_header(line):
            removed_count["single"] += 1
            i += 1
            continue
        
        # Check for multi-line department headers
        multiline_header_length = is_multiline_department_header(lines, i)
        if multiline_header_length > 0:
            removed_count["multi"] += 1
            # Skip all lines that form the multi-line header
            i += multiline_header_length
            continue
        
        # Skip page numbers and remove the previous line (page footer) only if it's not a department header
        if is_page_number(line):
            if result and not is_department_header(result[-1]):
                result.pop()  # Remove previous line (page footer) only if it's not a department header
            removed_count["pages"] += 1
            i += 1
            continue
            
        result.append(lines[i])
        i += 1
    
    print(f"Removed: {removed_count['single']} single-line headers, {removed_count['multi']} multi-line headers, {removed_count['pages']} page numbers")
    return result


def parse_course_code(course_code_str: str) -> Dict[str, List[str]]:
    """
    Parses a course code string into structured format.
    
    Args:
        course_code_str: Course code like "Ae/APh/CE/ME 101 abc"
    
    Returns:
        Dict with "prefixes", "numbers", and "letters" arrays
    """
    course_code_str = course_code_str.strip()
    parts = course_code_str.split()
    
    if not parts:
        return {"prefixes": [], "numbers": [], "letters": []}
    
    # Extract prefixes (first part, split by '/')
    prefixes = [p.strip() for p in parts[0].split('/') if p.strip()]
    
    numbers = []
    letters = []
    
    # Process remaining parts
    for part in parts[1:]:
        part = part.strip()
        if not part:
            continue
            
        if re.search(r'\d', part):
            # Contains numbers - extract all numbers (handles "3/103")
            if '/' in part:
                numbers.extend(re.findall(r'\d+', part))
            else:
                num_match = re.search(r'\d+', part)
                if num_match:
                    numbers.append(num_match.group())
        else:
            # Contains letters only
            letters.append(part)
    
    return {
        "prefixes": prefixes,
        "numbers": numbers, 
        "letters": letters
    }


def extract_course_header(text_block: List[str]) -> Tuple[Optional[str], Optional[str], str]:
    """Extract course code and name from the text block."""
    first_line = text_block[0]
    
    # Try standard pattern first (code and name on same line)
    header_match = re.match(
        r'^(?P<code>[A-Z][a-zA-Z\s/&]+\s\d{1,3}.*?)\.\s(?P<name>.*?)\.',
        first_line
    )
    
    if header_match:
        course_code = header_match.group('code').strip()
        name = header_match.group('name').strip()
        remaining_text = first_line[header_match.end():].strip() + ' ' + ' '.join(text_block[1:])
        return course_code, name, remaining_text
    
    # Handle multi-line names
    code_match = re.match(
        r'^(?P<code>(?:[A-Z][a-zA-Z\s/&]+\s\d{1,3}.*?)|(?:[A-Z][a-zA-Z]{1,4}\s\d{1,3}/\d{1,3}))\.\s(?P<name_start>.*)', 
        first_line
    )
    
    if not code_match:
        return None, None, ' '.join(text_block)
    
    course_code = code_match.group('code').strip()
    full_text = ' '.join(text_block)
    
    # Find complete name between periods
    pattern = re.escape(course_code) + r'\.\s+(.*?)\.'
    name_match = re.search(pattern, full_text)
    
    if name_match:
        name = name_match.group(1).strip()
        remaining_text = full_text[name_match.end():].strip()
    else:
        name = code_match.group('name_start')
        remaining_text = ' '.join(text_block[1:])
    
    return course_code, name, remaining_text


def extract_units_and_terms(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract units and terms information from text."""
    parts = text.split(';', 1)
    first_part = parts[0]
    
    units = None
    terms = None
    
    if 'units' in first_part.lower():
        units = first_part.strip()
        
        if not units.lower().startswith(('units in accordance', 'units to be')):
            if len(parts) > 1:
                terms = parts[1].split('.')[0].strip()
    elif len(parts) > 1:
        terms = parts[1].split('.')[0].strip()
    
    return units, terms


def extract_prerequisites(text: str) -> Optional[str]:
    """Extract prerequisites from text."""
    prereq_match = re.search(r'Prerequisites:\s*(.*?)\.', text, re.IGNORECASE | re.DOTALL)
    if prereq_match:
        return ' '.join(prereq_match.group(1).split()).strip()
    return None


def extract_instructors(text: str) -> Optional[str]:
    """Extract instructors from text."""
    instructor_match = re.search(r'Instructors?:\s(.*?)(?:\sNot offered|$)', text, re.IGNORECASE | re.DOTALL)
    if instructor_match:
        return ' '.join(instructor_match.group(1).split()).strip().rstrip('.')
    return None


def extract_description(text: str, prereq_match, instructor_match, header_end: int) -> Optional[str]:
    """Extract course description from text."""
    description_start = prereq_match.end() if prereq_match else header_end
    description_end = instructor_match.start() if instructor_match else len(text)
    
    if description_start >= description_end:
        return None
    
    description_text = text[description_start:description_end]
    description = ' '.join(description_text.strip().strip('; .').split())
    
    return description if description and not description.lower().startswith('prerequisites') else None


def parse_course_info(text_block: List[str]) -> Optional[Dict[str, Any]]:
    """Parse course information from a text block."""
    full_text = ' '.join(line.strip() for line in text_block)

    # Skip courses that refer to other descriptions
    if "for course description, see" in full_text.lower():
        return None

    # Extract basic course information
    course_code, name, remaining_text = extract_course_header(text_block)
    if not course_code or not name:
        return None

    # Extract additional information
    units, terms = extract_units_and_terms(remaining_text)
    prerequisites = extract_prerequisites(full_text)
    instructors = extract_instructors(full_text)
    
    # For description extraction, we need the regex match objects
    prereq_match = re.search(r'Prerequisites:\s*(.*?)\.', full_text, re.IGNORECASE | re.DOTALL)
    instructor_match = re.search(r'Instructors?:\s(.*?)(?:\sNot offered|$)', full_text, re.IGNORECASE | re.DOTALL)
    
    # Estimate header end position
    header_end = len(course_code) + len(name) + 4  # approximate
    
    description = extract_description(full_text, prereq_match, instructor_match, header_end)
    
    # Parse the course code into structured format
    parsed_course_code = parse_course_code(course_code)
    
    return {
        "course_code": parsed_course_code,
        "course_code_original": course_code,
        "name": name,
        "units": units,
        "terms": terms,
        "prerequisites": prerequisites,
        "description": description,
        "instructors": instructors
    }


def is_valid_course_ending(line: str, previous_line: str = "") -> bool:
    """Check if a line represents a valid course ending."""
    if not line:
        return False
    
    line_stripped = line.rstrip()
    line_lower = line_stripped.lower()
    
    # Check for period, semicolon, or specific words
    if line_stripped.endswith(('.', ';', 'Seminars', 'Geology', 'Biophysics')):
        return True
    
    # Check for "Not offered" patterns
    if 'not offered' in line_lower:
        return True
    
    # Check for instructor patterns
    if any(pattern in line_lower for pattern in ['instructor:', 'instructors:']):
        return True
    
    # Check for course redirect patterns (For course description,)
    if 'for course description,' in line_lower:
        return True
    
    # Check for complete "see [DEPARTMENT_NAME]" pattern by concatenating with previous line
    # This handles cases where "see" and the department name are split across lines
    if previous_line:
        combined_text = f"{previous_line.rstrip()} {line_stripped}".lower()
        # Check if the combined text ends with "see [department_name]"
        for dept in DEPARTMENT_NAMES:
            if combined_text.endswith(f'see {dept.lower()}'):
                return True
    
    # Check for single-line "see [DEPARTMENT_NAME]" pattern
    for dept in DEPARTMENT_NAMES:
        if line_lower.endswith(f'see {dept.lower()}'):
            return True
    
    return False


def is_page_number_line(line: str) -> bool:
    """Check if a line is just a page number."""
    return bool(re.match(r'^[A-Z][\w\s&]+\s\d+$', line))


def get_course_start_pattern() -> re.Pattern:
    """Get the regex pattern for identifying course starts."""
    return re.compile(
        r'^(?:'
        r'[A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})*\s\d{1,3}(?:\s[a-z]+)*'  # Cross-listed depts
        r'|'
        r'[A-Z][a-zA-Z]{1,4}\s\d{1,3}/\d{1,3}(?:\s[a-z]+)*'  # Primary/secondary numbers
        r'|'
        r'[A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})+\s\d{1,3}/\d{1,3}(?:\s[a-z]+)*'  # Cross-listed with primary/secondary
        r')\.\s+'
    )


def should_start_new_course(line: str, previous_line: str, two_lines_back: str, course_start_pattern: re.Pattern) -> bool:
    """Determine if a line should start a new course block."""
    if not course_start_pattern.match(line):
        return False
    
    if is_page_number_line(line):
        return False
    
    if "for course description, see" in line.lower():
        return False
    
    return is_valid_course_ending(previous_line, two_lines_back)


def preprocess_embedded_courses(lines: List[str]) -> List[str]:
    """Preprocess lines to separate embedded course codes from instructor information."""
    processed_lines = []
    
    # Pattern to find instructor info followed by course code on same line
    embedded_pattern = re.compile(
        r'(.*?Instructors?:\s[^.]+\.)\s+([A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})*\s\d{1,3}(?:\s[a-z]+)*\.\s+.*)'
    )
    
    for line in lines:
        stripped_line = line.strip()
        match = embedded_pattern.match(stripped_line)
        
        if match:
            # Split the line: instructor part ends, course starts on new line
            instructor_part = match.group(1).strip()
            course_part = match.group(2).strip()
            
            processed_lines.extend([instructor_part, course_part])
        else:
            processed_lines.append(stripped_line)
    
    return processed_lines


def convert_catalog_to_json(cleaned_lines: List[str]) -> List[Dict[str, Any]]:
    """
    Processes the cleaned catalog lines and converts them to structured JSON format.
    """
    all_courses = []
    current_course_block = []

    # Regex to identify the start of a course code
    course_start_pattern = re.compile(
        r'^(?:'
        r'[A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})*\s\d{1,3}(?:\s[a-z]+)?'  # Cross-listed depts with optional letters (single or multiple)
        r'|'
        r'[A-Z][a-zA-Z]{1,4}\s\d{1,3}/\d{1,3}(?:\s[a-z]+)?'  # Primary/secondary numbers with optional letters
        r'|'
        r'[A-Z][a-zA-Z]{1,4}(?:/[A-Z][a-zA-Z]{1,4})+\s\d{1,3}/\d{1,3}(?:\s[a-z]+)?'  # Cross-listed with primary/secondary numbers
        r')\.\s+'
    )
    
    previous_line = ""
    two_lines_back = ""
    
    for line in cleaned_lines:
        stripped_line = line.strip()
        if not stripped_line:
            continue

        is_course_start = bool(course_start_pattern.match(stripped_line))
        
        # Additional check: if this looks like a course start, verify the previous line ends with a valid pattern
        # This prevents course codes mentioned in descriptions from being treated as new courses
        # Exception: department headers are valid starting points for new courses
        if is_course_start and previous_line and not is_valid_course_ending(previous_line, two_lines_back) and not is_department_header(previous_line):
            is_course_start = False

        # A new block starts with a course code.
        # When a new block starts, process the one we've been collecting.
        if is_course_start and current_course_block:
            course_data = parse_course_info(current_course_block)
            if course_data:
                all_courses.append(course_data)
            current_course_block = []

        if is_course_start:
            current_course_block.append(stripped_line)
        # If it's not a new course and we are in the middle of a block,
        # it must be a continuation of the previous course's description.
        elif current_course_block:
            current_course_block.append(stripped_line)
        
        # Update line tracking for next iteration (do this after processing current line)
        two_lines_back = previous_line
        previous_line = stripped_line
            
    # Process the last course block after the loop finishes
    if current_course_block:
        course_data = parse_course_info(current_course_block)
        if course_data:
            all_courses.append(course_data)

    return all_courses


def process_catalog_file(input_file: str, output_file: str) -> None:
    """Process the catalog file from uncleaned text directly to JSON."""
    try:
        # Read the uncleaned catalog file
        with open(input_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        print(f"Read {len(lines)} lines from '{input_file}'")
        
        # Clean the catalog text (remove headers and page numbers)
        cleaned_lines = clean_catalog_text(lines)
        print(f"Successfully cleaned catalog: {len(lines)} -> {len(cleaned_lines)} lines")
        
        # Convert to JSON format
        all_courses = convert_catalog_to_json(cleaned_lines)
        
        # Write the JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_courses, f, indent=4)

        logger.info(f"Successfully parsed {len(all_courses)} courses and saved to '{output_file}'.")
        
    except FileNotFoundError:
        logger.error(f"Input file '{input_file}' not found")
        raise
    except json.JSONEncodeError as e:
        logger.error(f"JSON encoding error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing file: {e}")
        raise


def main():
    """Main function to run the catalog processing."""
    input_file = Path('catalog_uncleaned.txt')
    output_file = Path('catalog.json')
    
    if not input_file.exists():
        logger.error(f"Input file '{input_file}' not found")
        return 1
    
    try:
        logger.info("Starting catalog processing...")
        process_catalog_file(str(input_file), str(output_file))
        logger.info(f"Catalog processing completed successfully. Output: {output_file}")
        return 0
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
