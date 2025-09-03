import json
from catalog_processor import parse_courses_from_text

with open('test_cs171.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

courses = parse_courses_from_text(lines)
print(f'Found {len(courses)} courses:')
for course in courses:
    print(f'  {course["course_code"]}: {course["name"]}')
