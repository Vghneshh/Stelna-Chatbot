const { detectIntent, extractSignalsForQuestion, validateWithLLM } = require('./ai/intentAnalyzer.js');

async function testHybridValidation() {
  console.log('\n=== Testing Hybrid Validation (Signal + LLM) ===\n');
  
  // Test 1: Q2 - Clear timeline signals (passes Layer 1)
  console.log('TEST 1: Q2 Timeline - "We plan to launch next summer"');
  const test1 = await detectIntent('We plan to launch next summer', 'q2_roadmap');
  console.log('Result:', test1 === 'ANSWER' ? '✓ ACCEPTED (signal match)' : '✗ REJECTED');
  console.log();
  
  // Test 2: Q2 - Different phrasing with time reference
  console.log('TEST 2: Q2 Timeline - "Planning Q3 release"');
  const test2 = await detectIntent('Planning Q3 release', 'q2_roadmap');
  console.log('Result:', test2 === 'ANSWER' ? '✓ ACCEPTED' : '✗ REJECTED');
  console.log();
  
  // Test 3: Q2 - Off-topic (no signals, LLM should reject)
  console.log('TEST 3: Q2 Timeline - "Smart device" (off-topic, no timeline signals)');
  const test3 = await detectIntent('Smart device', 'q2_roadmap');
  console.log('Result:', test3 === 'INCOMPLETE' ? '✓ REJECTED (correct)' : '✗ ACCEPTED (wrong)');
  console.log();
  
  // Test 4: Q3 Design - Clear design signal
  console.log('TEST 4: Q3 Design - "Early prototype built"');
  const test4 = await detectIntent('Early prototype built', 'q3_design');
  console.log('Result:', test4 === 'ANSWER' ? '✓ ACCEPTED (design signal)' : '✗ REJECTED');
  console.log();
  
  // Test 5: Q1 Product - Has product signal
  console.log('TEST 5: Q1 Product - "Smart water bottle device"');
  const test5 = await detectIntent('Smart water bottle device', 'q1_product');
  console.log('Result:', test5 === 'ANSWER' ? '✓ ACCEPTED (product signal)' : '✗ REJECTED');
  console.log();

  // Test 6: Q4 Function - Has sensor/output signals
  console.log('TEST 6: Q4 Function - "It measures water intake and sends alerts"');
  const test6 = await detectIntent('It measures water intake and sends alerts', 'q4_function');
  console.log('Result:', test6 === 'ANSWER' ? '✓ ACCEPTED (sensor + output)' : '✗ REJECTED');
  console.log();

  // Test 7: Q8 Safety - Minimal content (needs LLM)
  console.log('TEST 7: Q8 Safety - "Non toxic" (minimal, will use LLM)');
  const test7 = await detectIntent('Non toxic', 'q8_safety');
  console.log('Result:', test7 === 'ANSWER' ? '✓ ACCEPTED (LLM validation)' : '✗ REJECTED');
  console.log();
  
  console.log('=== Hybrid Validation Tests Complete ===\n');
}

testHybridValidation().catch(e => console.error('Error:', e.message));
