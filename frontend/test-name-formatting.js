// Test the formatFullName function

function formatFullName(name) {
  if (!name) return '';
  
  return name
    .split(/\s+/) // Split by one or more spaces
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Test cases
const tests = [
  'amanuel abate horeta',
  'JOHN DOE SMITH',
  'mary jane',
  'john',
  '  multiple   spaces   here  ',
  'MixEd CaSe NaMeS',
];

console.log('Testing formatFullName function:\n');
tests.forEach(test => {
  const result = formatFullName(test);
  console.log(`Input:  "${test}"`);
  console.log(`Output: "${result}"`);
  console.log('---');
});
