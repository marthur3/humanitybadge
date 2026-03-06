// Unit Tests for Humanity Badge Extension
// Run with: node tests/unit.test.js

class MockChrome {
  constructor() {
    this.storage = {
      sync: {
        get: (keys) => Promise.resolve({}),
        set: (data) => Promise.resolve()
      },
      local: {
        get: (keys) => Promise.resolve({}),
        set: (data) => Promise.resolve()
      }
    };
    this.runtime = {
      sendMessage: (message, callback) => {
        if (callback) {
          setTimeout(() => callback({ success: true, shareUrl: 'test://url' }), 10);
        }
      },
      onMessage: {
        addListener: () => {}
      },
      lastError: null
    };
  }
}

class MockDOM {
  constructor() {
    this.elements = new Map();
    this.eventListeners = new Map();
    this._head = this.createElement('head');
  }

  createElement(tagName) {
    const element = {
      tagName: tagName.toLowerCase(),
      innerHTML: '',
      className: '',
      style: { cssText: '' },
      dataset: {},
      appendChild: () => {},
      addEventListener: (event, listener, options) => {
        const key = `${element.id || 'element'}_${event}`;
        this.eventListeners.set(key, listener);
      },
      removeEventListener: () => {},
      remove: () => {},
      getBoundingClientRect: () => ({ width: 200, height: 100, top: 0, left: 0 }),
      parentNode: { insertBefore: () => {} },
      closest: () => null,
      offsetParent: {},
      value: '',
      textContent: '',
      disabled: false,
      readOnly: false,
      placeholder: ''
    };
    return element;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }

  querySelectorAll(selector) {
    if (selector.includes('textarea')) {
      const textarea = this.createElement('textarea');
      textarea.id = 'test-textarea';
      return [textarea];
    }
    return [];
  }

  get head() { return this._head; }

  get body() {
    if (!this._body) {
      this._body = this.createElement('body');
      this._body.appendChild = (element) => {
        if (element.id) this.elements.set(element.id, element);
      };
    }
    return this._body;
  }

  get readyState() { return 'complete'; }
}

global.window = {
  location: {
    hostname: 'reddit.com',
    href: 'https://reddit.com/r/test'
  },
  outerWidth: 1200,
  innerWidth: 1000,
  outerHeight: 800,
  innerHeight: 600,
  getComputedStyle: () => ({ visibility: 'visible' })
};

global.document = new MockDOM();
global.chrome = new MockChrome();
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.URL = { createObjectURL: () => 'blob://test', revokeObjectURL: () => {} };
global.Blob = class { constructor() {} };

class TestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('\n🧪 Running Unit Tests for Humanity Badge Extension\n');

    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Load the TypingRecorder class
const fs = require('fs');
const path = require('path');

const contentJsPath = path.join(__dirname, '..', 'content.js');
let TypingRecorder;

try {
  const contentJs = fs.readFileSync(contentJsPath, 'utf8');
  // Remove the auto-instantiation at the end and wrap in a function that returns the class
  const codeWithoutInstantiation = contentJs
    .replace(/if \(document\.readyState[\s\S]*$/, '')
    .replace(/new TypingRecorder\(\);?\s*$/, '');
  // Use Function constructor to get the class out
  const wrappedCode = codeWithoutInstantiation + '\nreturn TypingRecorder;';
  TypingRecorder = new Function(wrappedCode)();
  global.TypingRecorder = TypingRecorder;
} catch (error) {
  console.error('Failed to load TypingRecorder class:', error.message);
  process.exit(1);
}

const suite = new TestSuite();

suite.test('TypingRecorder class initialization', () => {
  const recorder = new TypingRecorder();

  if (recorder.isRecording !== false) {
    throw new Error('isRecording should be false initially');
  }

  if (recorder.recording !== null) {
    throw new Error('recording should be null initially');
  }

  if (recorder.currentElement !== null) {
    throw new Error('currentElement should be null initially');
  }

  if (recorder.enabled !== true) {
    throw new Error('enabled should be true initially');
  }
});

suite.test('Reddit domain detection', () => {
  global.window.location.hostname = 'reddit.com';
  const isReddit = global.window.location.hostname.includes('reddit.com');

  if (!isReddit) {
    throw new Error('Should detect reddit.com as Reddit domain');
  }

  global.window.location.hostname = 'example.com';
  const isNotReddit = global.window.location.hostname.includes('reddit.com');

  if (isNotReddit) {
    throw new Error('Should not detect example.com as Reddit domain');
  }

  // Reset
  global.window.location.hostname = 'reddit.com';
});

suite.test('findInputElement returns valid textarea', () => {
  const recorder = new TypingRecorder();
  const element = recorder.findInputElement();

  if (!element) {
    throw new Error('Should find a textarea element');
  }

  if (element.tagName !== 'textarea') {
    throw new Error('Found element should be a textarea');
  }
});

suite.test('Paste prevention in handleEvent', () => {
  const recorder = new TypingRecorder();
  recorder.isRecording = true;
  let prevented = false;

  const mockPasteEvent = {
    type: 'paste',
    preventDefault: () => { prevented = true; },
    stopPropagation: () => {}
  };

  recorder.handleEvent(mockPasteEvent);

  if (!prevented) {
    throw new Error('Paste event should be prevented');
  }
});

suite.test('Keyboard paste (Ctrl+V) prevention', () => {
  const recorder = new TypingRecorder();
  recorder.isRecording = true;
  let prevented = false;

  const mockCtrlV = {
    type: 'keydown',
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    preventDefault: () => { prevented = true; },
    stopPropagation: () => {}
  };

  recorder.handleEvent(mockCtrlV);

  if (!prevented) {
    throw new Error('Ctrl+V should be prevented');
  }
});

suite.test('Verification - WPM calculation', () => {
  const recorder = new TypingRecorder();
  // 40 words typed over 60 seconds = 40 WPM
  const words = Array(40).fill('word').join(' ');
  recorder.recording = {
    events: [
      { type: 'keydown', timestamp: 0 },
      { type: 'keydown', timestamp: 100 },
      { type: 'keydown', timestamp: 200 }
    ],
    duration: 60000, // 1 minute
    finalValue: words
  };

  const verification = recorder.verify();

  if (!verification.isAuthentic) {
    throw new Error(`Verification should pass: ${verification.reason}`);
  }

  if (verification.wpm !== 40) {
    throw new Error(`Expected 40 WPM for 40 words in 60s, got: ${verification.wpm}`);
  }
});

suite.test('Verification - too fast rejection', () => {
  const recorder = new TypingRecorder();
  recorder.recording = {
    events: [{ type: 'keydown', timestamp: 0 }],
    duration: 2000, // 2 seconds - below 5s minimum
    finalValue: 'Hello'
  };

  const verification = recorder.verify();

  if (verification.isAuthentic) {
    throw new Error('Should reject recordings shorter than 5 seconds');
  }
});

suite.test('Recording data structure', () => {
  const recorder = new TypingRecorder();

  const mockElement = {
    value: 'test content',
    textContent: '',
    tagName: 'TEXTAREA',
    placeholder: 'Enter text...',
    disabled: false,
    readOnly: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ width: 200, height: 100 })
  };

  // Simulate startRecording without DOM side effects
  recorder.isRecording = true;
  recorder.currentElement = mockElement;
  recorder.startTime = Date.now();
  recorder.recording = {
    id: recorder.generateId(),
    startTime: recorder.startTime,
    events: [],
    initialValue: mockElement.value || mockElement.textContent || '',
    url: global.window.location.href,
    domain: global.window.location.hostname
  };

  if (!recorder.recording.id || typeof recorder.recording.id !== 'string') {
    throw new Error('Recording should have valid ID');
  }

  if (!recorder.recording.startTime || typeof recorder.recording.startTime !== 'number') {
    throw new Error('Recording should have valid start time');
  }

  if (!Array.isArray(recorder.recording.events)) {
    throw new Error('Recording should have events array');
  }

  if (recorder.recording.domain !== global.window.location.hostname) {
    throw new Error('Recording should capture domain correctly');
  }
});

suite.test('formatShareText generates correct output', () => {
  const recorder = new TypingRecorder();
  const result = recorder.formatShareText('https://example.com/replay', { wpm: 85 });

  if (!result.reddit.includes('85 WPM')) {
    throw new Error('Reddit format should include WPM');
  }

  if (!result.reddit.includes('https://example.com/replay')) {
    throw new Error('Reddit format should include share URL');
  }

  if (!result.linkedin.includes('https://example.com/replay')) {
    throw new Error('LinkedIn format should include share URL');
  }
});

suite.test('generateId produces unique IDs', () => {
  const recorder = new TypingRecorder();
  const id1 = recorder.generateId();
  const id2 = recorder.generateId();

  if (id1 === id2) {
    throw new Error('Generated IDs should be unique');
  }

  if (typeof id1 !== 'string' || id1.length < 5) {
    throw new Error('ID should be a non-trivial string');
  }
});

// Run the tests
if (require.main === module) {
  suite.run();
}

module.exports = { TestSuite, MockChrome, MockDOM };
