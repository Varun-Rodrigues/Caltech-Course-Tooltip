import json

# Load the catalog
with open('catalog.json', 'r') as f:
    catalog = json.load(f)

# Collect all unique letters
all_letters = set()
courses_with_letters = []

for course in catalog:
    if 'course_code' in course and 'letters' in course['course_code'] and course['course_code']['letters']:
        letters = course['course_code']['letters']
        # Letters might be in format like ["abc"] or ["a", "b", "c"]
        for letter_group in letters:
            # If it's a string like "abc", split into individual letters
            if isinstance(letter_group, str):
                all_letters.update(list(letter_group))
            else:
                all_letters.add(letter_group)
        
        prefixes = course['course_code']['prefixes']
        numbers = course['course_code']['numbers']
        course_name = f"{'/'.join(prefixes)} {'/'.join(numbers)}"
        courses_with_letters.append({
            'course': course_name,
            'letters': letters
        })

print("All unique letters found:")
print(sorted(all_letters))
print()

# Find non-standard letters (not a, b, c, d, x)
standard_letters = {'a', 'b', 'c', 'd', 'x'}
non_standard = all_letters - standard_letters

print("Non-standard letters (not a, b, c, d, x):")
print(sorted(non_standard))
print()

# Show courses with non-standard letters
if non_standard:
    print("Courses with non-standard letters:")
    for course_info in courses_with_letters:
        course_letters = set(course_info['letters'])
        if course_letters & non_standard:  # intersection
            print(f"{course_info['course']}: {course_info['letters']}")
    print()

# Show all courses with letters, grouped by type
print("=== DETAILED ANALYSIS ===")
print()

print("Courses with standard letters (a, b, c only):")
standard_only = []
for course_info in courses_with_letters:
    course_letters = set()
    for letter_group in course_info['letters']:
        if isinstance(letter_group, str):
            course_letters.update(list(letter_group))
        else:
            course_letters.add(letter_group)
    
    if course_letters and course_letters.issubset({'a', 'b', 'c'}):
        standard_only.append(f"{course_info['course']}: {course_info['letters']}")

for course in sorted(set(standard_only))[:10]:  # Show first 10
    print(course)
print(f"... and {len(set(standard_only)) - 10} more")
print()

print("Courses with 'd' variants:")
for course_info in courses_with_letters:
    course_letters = set()
    for letter_group in course_info['letters']:
        if isinstance(letter_group, str):
            course_letters.update(list(letter_group))
        else:
            course_letters.add(letter_group)
    if 'd' in course_letters:
        print(f"{course_info['course']}: {course_info['letters']}")
print()

print("Courses with 'x' variants:")
for course_info in courses_with_letters:
    course_letters = set()
    for letter_group in course_info['letters']:
        if isinstance(letter_group, str):
            course_letters.update(list(letter_group))
        else:
            course_letters.add(letter_group)
    if 'x' in course_letters:
        print(f"{course_info['course']}: {course_info['letters']}")
print()

print("Bi 1 - all variants:")
bi_1_letters = []
for course_info in courses_with_letters:
    if 'Bi 1' in course_info['course']:
        course_letters = set()
        for letter_group in course_info['letters']:
            if isinstance(letter_group, str):
                course_letters.update(list(letter_group))
            else:
                course_letters.add(letter_group)
        bi_1_letters.extend(course_letters)

print(f"Bi 1 unique letters: {sorted(set(bi_1_letters))}")
print()

print("Summary for regex design:")
print("- Standard regex should handle: a, b, c combinations")
print("- Edge cases need special handling:")
print("  * d variants:", [course for course in courses_with_letters if any('d' in str(letter) for letter in course['letters'])])
print("  * x variants:", [course for course in courses_with_letters if any('x' in str(letter) for letter in course['letters'])])
print("  * Bi 1 special letters: e, g, i, m")
