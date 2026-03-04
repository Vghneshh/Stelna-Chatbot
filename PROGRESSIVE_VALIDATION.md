# Progressive Signal Collection - Smart Validation & Follow-ups

## Overview

Instead of **strict rejection** for incomplete answers, the system now uses **progressive signal collection** with conversational follow-ups. 

**Old Logic (Bad UX):**
```
if (signals found) → accept
else → reject "That doesn't answer the question"
```

**New Logic (Conversational):**
```
if (primary signals found) → accept + acknowledge
   check for secondary signals
   if missing → ask follow-up question
```

---

## Architecture

### Signal Definitions (per Question)

Each question now defines:
- **Primary signals** (must-have): Answer is valid if ANY primary signal found
- **Secondary signals** (nice-to-have): Collected via follow-ups for richer context

**Example - Q1 (Product Overview):**
```javascript
{
  primary: ['product'],        // MUST mention product/solution/device
  secondary: ['problem', 'user', 'market']  // Ask for these if missing
}
```

### Validation Flow

```
User Answer
    ↓
1. extractSignalsForQuestion()
    ├→ Find primary signals?
    │  ├─ YES → ACCEPT answer
    │  └─ NO → Hybrid validation (signal + LLM)
    ↓
2. getMissingSignals()
    ├→ Check which secondary signals missing
    ↓
3. buildProgressiveResponse()
    ├→ Acknowledge what they said
    ├→ Ask for missing signals (if any)
    └→ Return conversational response
    ↓
4. Accept & Move to next Q
```

---

## Signal Definitions by Question

### Q1: Product Overview
- **Primary:** `product` (must describe what you're building)
- **Secondary:** `problem`, `user`, `market`
- **Example:**
  - Input: "We make a smart water bottle"
  - Signals found: ✓ product
  - Missing: problem, user, market
  - Response: "Perfect — a smart water bottle! What problem does it solve?"

### Q2: Development Timeline
- **Primary:** `timeline` | `timeframe` | `milestone` | `stage` (any timeline indicator)
- **Secondary:** `milestone`, `stage`
- **Example:**
  - Input: "We plan to launch next summer"
  - Signals found: ✓ timeline, timeframe, milestone
  - Missing: none
  - Response: "Great — you're targeting launch next summer."

### Q3: Design Clarity
- **Primary:** `design` (prototypes, sketches, CAD)
- **Secondary:** `toolsUsed`, `appearance`, `functional`
- **Example:**
  - Input: "Early prototype built"
  - Signals found: ✓ design
  - Missing: toolsUsed, appearance, functional
  - Response: "Excellent — you've built a prototype! What tools did you use?"

### Q4: How It Works
- **Primary:** `functionality` | `sensors` | `outputs` (how it works)
- **Secondary:** `control`
- **Example:**
  - Input: "It measures water intake and sends alerts"
  - Signals found: ✓ sensors, outputs
  - Missing: control
  - Response: "Great — it has sensing and alert features! Will it have any electronics or control logic?"

### Q5: Materials & Manufacturing
- **Primary:** `material` (must mention materials)
- **Secondary:** `manufacturing`, `sourcing`

### Q6: Compliance & Standards
- **Primary:** `standards` | `safety` | `domain` (awareness required)
- **Secondary:** none

### Q7: Testing
- **Primary:** `testing` (must mention testing)
- **Secondary:** `userTest`, `durability`

### Q8: Safety
- **Primary:** `safetyAware` (safety awareness)
- **Secondary:** `mitigation` (prevention measures)

### Q9: Electronics
- **Primary:** `electronics` (electronic components mentioned)
- **Secondary:** `processor`, `communication`

### Q10: Components
- **Primary:** `components` (parts/components mentioned)
- **Secondary:** `documented` (BOM or detailed list)

---

## Code Implementation

### Key Functions (intentAnalyzer.js)

#### 1. `getSignalDefinitions(questionId)`
Returns primary and secondary signals for a question.
```javascript
{
  primary: ['signal1', 'signal2'],    // Acceptance threshold
  secondary: ['signal3', 'signal4']   // Follow-up prompts
}
```

#### 2. `getMissingSignals(signals, questionId)`
Identifies which secondary signals are absent.
```javascript
// Input: { product: true }, 'q1_product'
// Output: ['problem', 'user', 'market']
```

#### 3. `generateFollowUpQuestion(questionId, signals, extractedSignals)`
Creates conversational follow-up for missing signals.
```javascript
// For Q1 missing 'problem':
// "What problem does it solve for them?"
```

#### 4. `buildProgressiveResponse(questionId, message, signals)`
Builds acknowledgment + optional follow-up.
```javascript
// Input: "smart water bottle" with only 'product' signal
// Output: "Perfect — a smart water bottle! What problem does it solve for them?"
```

---

## Response Examples

### Scenario 1: Q1 - Product Only (Missing User & Problem)
```
User: "Smart water bottle for hydration tracking"

Bot Signals:
  Found: [product]
  Missing: [problem, user, market]

Bot Response:
  "Great — you're working on a smart water bottle.
   
   Who is the main user for this product?"
```

### Scenario 2: Q2 - Timeline Mentioned (Primary Signal Match)
```
User: "We plan to launch Q4 2026, beta in Q3"

Bot Signals:
  Found: [timeline, timeframe, milestone]
  Missing: []

Bot Response:
  "Perfect — you're targeting Q4 launch with Q3 beta.
   That timeline is clear."
```

### Scenario 3: Q3 - Design Work (with Follow-up)
```
User: "We've created prototypes in SolidWorks"

Bot Signals:
  Found: [design, toolsUsed]
  Missing: [appearance, functional]

Bot Response:
  "Excellent — you've designed prototypes in SolidWorks!
   
   Can you describe the appearance or form factor?"
```

---

## Benefits

✅ **No Harsh Rejections** - Instead of "That doesn't answer the question," user gets dialogue
✅ **Progressive Information** - Collect missing signals incrementally
✅ **Flexible Phrasing** - "Smart water bottle" recognized as product
✅ **Conversational** - Acknowledges what user said before asking for more
✅ **Signal Accumulation** - Each answer adds signals for form auto-fill
✅ **Fast** - Primary signal check is regex-based (no API calls)
✅ **Intelligent Fallback** - LLM can validate edge cases if signals unclear

---

## UX Flow with Progressive Validation

```
User: "Check product readiness"
Bot:  "Question 1: What's your product? Who is the user? What domain?"

User: "Smart water bottle"
Bot:  "Great — you're building a smart water bottle!
       Who is the main user for this?"

User: "People who want to track daily hydration"
Bot:  "Got it! What problem does it solve for them?"

User: "Helps busy professionals remember to drink water"
Bot:  "Perfect! Now let's talk about your development..."
      
Bot:  "Question 2: What's your development timeline?"
...
```

This creates a natural dialogue that:
- ✓ Accepts valid input immediately (no false rejections)
- ✓ Fills in gaps via conversational follow-ups
- ✓ Accumulates rich signal data for form auto-fill
- ✓ Feels more human and helpful

---

## Configuration

To adjust validation strictness, modify `getSignalDefinitions()`:

**More Lenient** (fewer required signals):
```javascript
'q1_product': {
  primary: ['product'],  // Just product mention is enough
  secondary: []          // Don't ask for anything else
}
```

**More Strict** (require multiple signals):
```javascript
'q1_product': {
  primary: ['product', 'problem'],  // Must mention product AND problem
  secondary: ['user', 'market']
}
```

---

## Future Enhancements

1. **Multi-turn Follow-ups**: Ask for several missing signals in sequence
2. **Confidence-aware**: If user unsure, ask simpler follow-ups
3. **Context Memory**: Remember previous answers when asking follow-ups
4. **Smart Skip**: Skip follow-ups if context already provided
5. **LLM Follow-up Generation**: Use LLM to generate context-specific follow-ups
