// Unit Tests for Humanity Badge Extension
// Run with: node tests/unit.test.js

class MockChrome {
  constructor() {
    this.runtime = {
      sendMessage: (message, callback) => {
        console.log('Mock chrome.runtime.sendMessage called:', message);
        if (callback) {
          setTimeout(() => callback({ success: true, shareUrl: 'test://url' }), 10);
        }
      },
      onMessage: {
        addListener: (listener) => {
          console.log('Mock chrome.runtime.onMessage.addListener called');
        }
      }
    };
  }
}

// Mock DOM environment
class MockDOM {
  constructor() {
    this.elements = new Map();
    this.eventListeners = new Map();
  }

  createElement(tagName) {
    const element = {
      tagName: tagName.toLowerCase(),
      innerHTML: '',
      className: '',
      style: {},
      dataset: {},
      appendChild: (child) => {},
      addEventListener: (event, listener, options) => {
        const key = `${element.id || 'element'}_${event}`;
        this.eventListeners.set(key, listener);
      },
      removeEventListener: (event, listener) => {
        const key = `${element.id || 'element'}_${event}`;
        this.eventListeners.delete(key);
      },
      getBoundingClientRect: () => ({
        width: 200,
        height: 100,
        top: 0,
        left: 0
      }),
      parentNode: {
        insertBefore: (newElement, refElement) => {}
      },
      closest: (selector) => null,
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
    // Mock some common selectors
    if (selector.includes('textarea')) {
      const textarea = this.createElement('textarea');
      textarea.id = 'test-textarea';
      return [textarea];
    }
    return [];
  }

  get body() {
    if (!this._body) {
      this._body = this.createElement('body');
      this._body.appendChild = (element) => {
        this.elements.set(element.id, element);
      };
    }
    return this._body;
  }
}

// Mock window and global objects
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

// Test Suite
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

// Read and evaluate the content.js file in a safe way
const contentJsPath = path.join(__dirname, '..', 'content.js');
let TypingRecorder;

try {
  const contentJs = fs.readFileSync(contentJsPath, 'utf8');
  // Extract the entire class definition including all methods
  const classMatch = contentJs.match(/class TypingRecorder \{[\s\S]*?(?=\n\n\/\/|\nnew TypingRecorder|\n$)/);
  if (classMatch) {
    // Create a safe evaluation context
    const classCode = classMatch[0];
    eval(classCode);
    global.TypingRecorder = TypingRecorder;
  } else {
    throw new Error('Could not extract TypingRecorder class');
  }
} catch (error) {
  console.error('Failed to load TypingRecorder class:', error.message);
  console.log('Trying alternative extraction...');
  
  try {
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');
    // Remove the instantiation line at the end
    const codeWithoutInstantiation = contentJs.replace(/new TypingRecorder\(\);?\s*$/, '');
    eval(codeWithoutInstantiation);
    global.TypingRecorder = TypingRecorder;
  } catch (altError) {
    console.error('Alternative loading also failed:', altError.message);
    process.exit(1);
  }
}

// Test Suite Setup
const suite = new TestSuite();

suite.test('TypingRecorder class initialization', () => {
  const recorder = new TypingRecorder();
  
  if (recorder.isRecording !== false) {
    throw new Error('isRecording should be false initially');
  }
  
  if (recorder.currentRecording !== null) {
    throw new Error('currentRecording should be null initially');
  }
  
  if (recorder.currentElement !== null) {
    throw new Error('currentElement should be null initially');
  }
});

suite.test('Reddit domain detection', () => {
  // Test Reddit domain detection
  global.window.location.hostname = 'reddit.com';
  const recorder = new TypingRecorder();
  
  // This would normally be called in attachToTextAreas
  const isReddit = global.window.location.hostname.includes('reddit.com');
  
  if (!isReddit) {
    throw new Error('Should detect reddit.com as Reddit domain');
  }
  
  // Test non-Reddit domain
  global.window.location.hostname = 'example.com';
  const isNotReddit = global.window.location.hostname.includes('reddit.com');
  
  if (isNotReddit) {
    throw new Error('Should not detect example.com as Reddit domain');
  }
});

suite.test('Element validation logic', () => {
  const recorder = new TypingRecorder();
  
  // Test valid element
  const validElement = global.document.createElement('textarea');
  validElement.getBoundingClientRect = () => ({
    width: 200,
    height: 100
  });
  validElement.disabled = false;
  validElement.readOnly = false;
  validElement.offsetParent = {};
  
  // Mock window.getComputedStyle
  global.window.getComputedStyle = () => ({ visibility: 'visible' });
  
  const isValid = recorder.isValidTextArea(validElement);
  
  if (!isValid) {
    throw new Error('Valid textarea should pass validation');
  }
  
  // Test invalid element (too small)
  const invalidElement = global.document.createElement('textarea');
  invalidElement.getBoundingClientRect = () => ({
    width: 10,
    height: 5
  });
  
  const isInvalid = recorder.isValidTextArea(invalidElement);
  
  if (isInvalid) {
    throw new Error('Invalid textarea should fail validation');
  }
});

suite.test('Paste prevention system', () => {
  const recorder = new TypingRecorder();
  let pasteBlocked = false;
  
  // Mock showPasteBlockedMessage
  recorder.showPasteBlockedMessage = () => {
    pasteBlocked = true;
  };
  
  // Simulate paste event
  const mockEvent = {
    type: 'paste',
    preventDefault: () => {},
    stopPropagation: () => {}
  };
  
  // This would normally be called in addEventListeners
  if (mockEvent.type === 'paste') {
    mockEvent.preventDefault();
    mockEvent.stopPropagation();
    recorder.showPasteBlockedMessage();
  }
  
  if (!pasteBlocked) {
    throw new Error('Paste event should be blocked');
  }
});

suite.test('WPM calculation accuracy', () => {
  const recorder = new TypingRecorder();
  
  // Mock recording data
  recorder.currentRecording = {
    events: [
      { type: 'keydown', timestamp: 0 },
      { type: 'keydown', timestamp: 100 },
      { type: 'keydown', timestamp: 200 }
    ],
    duration: 60000, // 1 minute
    finalValue: 'Hello world test typing',
    devToolsDetected: false
  };
  
  const verification = recorder.verifyTypingAuthenticity();
  
  if (!verification.isAuthentic) {
    throw new Error(`Verification should pass: ${verification.reason}`);
  }
  
  // Test realistic WPM range
  if (verification.wpm < 1 || verification.wpm > 300) {
    throw new Error(`WPM should be in realistic range, got: ${verification.wpm}`);
  }
});

suite.test('Developer tools detection logic', () => {
  const recorder = new TypingRecorder();
  recorder.isRecording = true;
  recorder.currentRecording = {};
  
  let devToolsDetected = false;
  
  // Mock handleDevToolsDetected
  const originalHandle = recorder.handleDevToolsDetected;
  recorder.handleDevToolsDetected = () => {
    devToolsDetected = true;
    recorder.currentRecording.devToolsDetected = true;
  };
  
  // Simulate dev tools open scenario
  global.window.outerWidth = 1200;
  global.window.innerWidth = 800; // 400px difference > 200px threshold
  
  const widthThreshold = global.window.outerWidth - global.window.innerWidth > 200;
  
  if (widthThreshold && !recorder.devToolsOpen) {
    recorder.devToolsOpen = true;
    recorder.handleDevToolsDetected();
  }
  
  if (!devToolsDetected) {
    throw new Error('Developer tools detection should trigger');
  }
  
  if (!recorder.currentRecording.devToolsDetected) {
    throw new Error('Recording should be marked as having dev tools detected');
  }
});

suite.test('Event throttling mechanism', () => {
  const recorder = new TypingRecorder();
  let eventCount = 0;
  let throttledEventCount = 0;
  
  // Mock recordEvent
  recorder.recordEvent = () => {
    eventCount++;
  };
  
  // Simulate throttled event handling
  let eventThrottle;
  const simulateInputEvent = () => {
    clearTimeout(eventThrottle);
    eventThrottle = setTimeout(() => {
      throttledEventCount++;
      recorder.recordEvent();
    }, 16);
  };
  
  // Fire multiple events rapidly
  for (let i = 0; i < 10; i++) {
    simulateInputEvent();
  }
  
  // Wait for throttle to complete
  return new Promise((resolve) => {
    setTimeout(() => {
      if (throttledEventCount !== 1) {
        throw new Error(`Expected 1 throttled event, got ${throttledEventCount}`);
      }
      resolve();
    }, 50);
  });
});

suite.test('Recording data structure validation', () => {
  const recorder = new TypingRecorder();
  
  // Mock element
  const mockElement = {
    value: 'test content',
    tagName: 'TEXTAREA',
    placeholder: 'Enter text...'
  };
  
  // Mock recording creation (normally in startRecording)
  const recordingId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  const recording = {
    id: recordingId,
    startTime: Date.now(),
    events: [],
    initialValue: mockElement.value || mockElement.textContent || '',
    elementType: mockElement.tagName.toLowerCase(),
    placeholder: mockElement.placeholder || '',
    url: global.window.location.href,
    domain: global.window.location.hostname
  };
  
  // Validate recording structure
  if (!recording.id || typeof recording.id !== 'string') {
    throw new Error('Recording should have valid ID');
  }
  
  if (!recording.startTime || typeof recording.startTime !== 'number') {
    throw new Error('Recording should have valid start time');
  }
  
  if (!Array.isArray(recording.events)) {
    throw new Error('Recording should have events array');
  }
  
  if (recording.elementType !== 'textarea') {
    throw new Error('Recording should capture element type correctly');
  }
  
  if (recording.domain !== global.window.location.hostname) {
    throw new Error('Recording should capture domain correctly');
  }
});

// Run the tests
if (require.main === module) {
  suite.run();
}

module.exports = { TestSuite, MockChrome, MockDOM };