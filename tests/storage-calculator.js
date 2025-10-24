// Calculate storage capacity for recordings

// Typical recording structure
const typicalRecording = {
  id: "abc123xyz789",
  startTime: 1234567890123,
  endTime: 1234567890123,
  duration: 45000,
  events: [],
  initialValue: "",
  finalValue: "This is a typical comment that someone might write on Reddit or LinkedIn. It's usually a few sentences expressing an opinion or sharing some information. Let's say it's about 200 characters long.",
  url: "https://www.reddit.com/r/technology/comments/abc123/some_post_title/",
  domain: "reddit.com",
  verification: {
    isAuthentic: true,
    wpm: 85,
    duration: 45,
    characters: 200,
    words: 35
  }
};

// Generate typical events (one every 200ms for 45 seconds)
for (let i = 0; i < 225; i++) {
  typicalRecording.events.push({
    type: 'input',
    timestamp: i * 200,
    key: 'a',
    value: typicalRecording.finalValue.substring(0, Math.min(i, typicalRecording.finalValue.length))
  });
}

const json = JSON.stringify(typicalRecording);
const sizeInBytes = Buffer.byteLength(json, 'utf8');
const sizeInKB = (sizeInBytes / 1024).toFixed(2);

console.log('=== STORAGE CAPACITY ANALYSIS ===\n');
console.log('Single Recording Size (typical 45s comment):');
console.log('- Bytes:', sizeInBytes);
console.log('- KB:', sizeInKB);
console.log('- Events:', typicalRecording.events.length);
console.log('- Text length:', typicalRecording.finalValue.length, 'characters\n');

const chromeLocalLimit = 5 * 1024 * 1024; // 5MB default
const maxRecordings = Math.floor(chromeLocalLimit / sizeInBytes);

console.log('Chrome Storage Limits:');
console.log('- chrome.storage.local: 5 MB (default)');
console.log('- chrome.storage.sync: 100 KB (for settings only)\n');

console.log('CAPACITY (with 5MB limit):');
console.log('- Maximum recordings:', maxRecordings);
console.log('- Total storage used:', (maxRecordings * sizeInKB / 1024).toFixed(2), 'MB\n');

// Calculate for different recording lengths
const scenarios = [
  { name: 'Quick reply (10s, 50 chars)', duration: 10, chars: 50, events: 50 },
  { name: 'Short comment (30s, 150 chars)', duration: 30, chars: 150, events: 150 },
  { name: 'Medium comment (45s, 200 chars)', duration: 45, chars: 200, events: 225 },
  { name: 'Long comment (2min, 500 chars)', duration: 120, chars: 500, events: 600 },
  { name: 'Article/Essay (5min, 1500 chars)', duration: 300, chars: 1500, events: 1500 }
];

console.log('=== DIFFERENT SCENARIOS ===\n');
scenarios.forEach(scenario => {
  const rec = {...typicalRecording};
  rec.duration = scenario.duration * 1000;
  rec.finalValue = 'a'.repeat(scenario.chars);
  rec.events = [];
  for (let i = 0; i < scenario.events; i++) {
    rec.events.push({
      type: 'input',
      timestamp: i * 100,
      key: 'a',
      value: rec.finalValue.substring(0, i)
    });
  }
  const size = Buffer.byteLength(JSON.stringify(rec), 'utf8');
  const sizeKB = (size / 1024).toFixed(1);
  const max = Math.floor(chromeLocalLimit / size);
  console.log(scenario.name + ':');
  console.log('  Size: ' + sizeKB + ' KB');
  console.log('  Max recordings: ' + max);
  console.log('  Total capacity: ' + (max * sizeKB / 1024).toFixed(2) + ' MB\n');
});

console.log('=== RECOMMENDATIONS ===\n');
console.log('For typical usage (medium comments):');
console.log('- Users can store ~' + Math.floor(maxRecordings / 2) + '-' + maxRecordings + ' recordings');
console.log('- This equals weeks/months of daily use');
console.log('- Old recordings can be deleted from popup\n');

console.log('For power users:');
console.log('- Can request "unlimitedStorage" permission');
console.log('- Would allow unlimited local storage');
console.log('- Good for users who want to keep all history\n');

console.log('With URL shortening (GitHub Gist/is.gd):');
console.log('- Recordings can be deleted after sharing');
console.log('- Links remain valid (stored externally)');
console.log('- Extension becomes a "verification tool" not "storage"');
console.log('- Users could verify 100s of posts without storage issues');
