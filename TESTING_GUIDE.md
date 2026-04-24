# Premium Tab Transition — Testing Guide

## Quick Test Checklist

### ✅ Basic Functionality
- [ ] Click "Portfolio" tab and verify smooth transition
- [ ] Click "Comments" tab and verify smooth transition
- [ ] Pill indicator moves smoothly between tabs
- [ ] Active tab text is bright, inactive is dimmed
- [ ] Pill background is always behind the active tab

### ✅ Motion Quality
- [ ] Transition duration is exactly ~260ms (not too fast, not too slow)
- [ ] Opacity fade is subtle and smooth (not jarring)
- [ ] Scale transition is barely noticeable but adds depth
- [ ] No visible flicker or tearing during transitions
- [ ] Pill indicator glides smoothly (no jumps)

### ✅ Scroll Behavior
- [ ] Scroll to middle of Portfolio page
- [ ] Click Comments tab
- [ ] Scroll position is lost (expected)
- [ ] Go back to Portfolio—scroll position is restored
- [ ] Go to Comments and scroll to bottom
- [ ] Go to Portfolio and back to Comments—scroll is at bottom

### ✅ Gesture Support (Mobile)
- [ ] Tap tab and observe instant response
- [ ] Swipe left slowly—page slides left, pill moves right
- [ ] Swipe left quickly—snap to next page faster
- [ ] Swipe right to go back
- [ ] Swipe partially (< 18%) and release—snap back to current
- [ ] Swipe partially (> 18%) and release—snap to next

### ✅ Keyboard Navigation
- [ ] Press Tab key until navbar tabs are focused
- [ ] Press Arrow Right (→) to switch to Comments
- [ ] Press Arrow Left (←) to switch to Portfolio
- [ ] Focus indicator is always visible on active tab

### ✅ Accessibility
- [ ] Open System Settings → Accessibility → Display
- [ ] Enable "Reduce motion" / "Prefers reduced motion"
- [ ] Click tabs and verify transitions snap instantly (no animation)
- [ ] Disable "Reduce motion" and verify animations return
- [ ] Keyboard navigation still works in both modes

### ✅ Mobile Performance
- [ ] Open DevTools (F12)
- [ ] Go to Performance tab
- [ ] Click Record, swipe 5 times, stop recording
- [ ] Frame rate should stay at 60fps
- [ ] No orange/red indicators (dropped frames)
- [ ] Test on 4G throttle—still smooth

### ✅ Desktop Performance
- [ ] Open DevTools → Performance
- [ ] Record tab switching for 10 seconds
- [ ] Frame rate should be 60fps
- [ ] Long Tasks should be < 50ms
- [ ] Rendering should be < 16ms per frame

### ✅ Visual Continuity
- [ ] Colors match between pages (background, text)
- [ ] Fonts are consistent
- [ ] Spacing is consistent
- [ ] Navbar stays fixed at top during transitions
- [ ] Backgrounds (KitsysArrowField, GlowDots) don't jump

### ✅ Responsive Design
- [ ] Test on phone (375px) — pill indicator is visible
- [ ] Test on tablet (768px) — transition is smooth
- [ ] Test on desktop (1920px) — no layout issues
- [ ] Resize browser and verify pill recalculates position

### ✅ Browser Compatibility
- [ ] Chrome — smooth and responsive
- [ ] Safari — momentum scrolling works
- [ ] Firefox — transitions are smooth
- [ ] Edge — identical to Chrome
- [ ] iOS Safari — native app feel
- [ ] Android Chrome — swipe gestures work

## Detailed Testing Procedures

### Test 1: Transition Timing (Desktop)

1. Open DevTools Console
2. Add timing code:
```javascript
let lastTime = 0;
const observer = (entries) => {
  const now = performance.now();
  if (lastTime) {
    console.log(`Transition took: ${Math.round(now - lastTime)}ms`);
  }
  lastTime = now;
};
const mo = new MutationObserver(observer);
mo.observe(document.documentElement, { attributes: true });
```

3. Click the "Comments" tab
4. Check console output — should be ~260ms
5. Click back to "Portfolio" — should be ~260ms again

### Test 2: Motion Quality (Desktop)

1. Open DevTools → Performance → Record
2. Start recording
3. Click "Comments" tab
4. Stop recording immediately
5. Analyze the recording:
   - **Frame rate**: Should be 60fps (green bars)
   - **JavaScript**: Should be minimal (thin gray)
   - **Rendering**: Should be under 16ms per frame (thin purple)
   - **Painting**: Should be minimal (thin green)

### Test 3: Scroll Position (All Devices)

1. Scroll Portfolio page to specific position (e.g., Skills section)
2. Note the scroll position
3. Click Comments tab
4. Scroll Comments page to a different position
5. Click Portfolio tab
6. **Expected**: You should be back at the Skills section (same scroll)
7. Repeat with different scroll positions multiple times

### Test 4: Gesture Responsiveness (Mobile Only)

1. **Slow Swipe**:
   - Start from left edge
   - Drag slowly to right
   - Watch pill indicator move in real-time
   - Release and observe animation completion speed (~220ms)

2. **Fast Swipe**:
   - Start from left edge
   - Drag quickly to right
   - Watch pill snap faster (~140ms)

3. **Partial Swipe** (< 18% width):
   - Start from left edge
   - Drag 10% of screen width
   - Release
   - **Expected**: Snap back to current page

4. **Committed Swipe** (> 18% width):
   - Start from left edge
   - Drag 25% of screen width
   - Release
   - **Expected**: Snap to next page (even if slow)

### Test 5: Keyboard Navigation (All Devices)

1. Click inside the content area
2. Press Tab key multiple times until pill indicator is focused
3. Check that focus ring is visible around active tab
4. Press Arrow Right (→) key
5. **Expected**: Switch to next tab smoothly
6. Press Arrow Left (←) key
7. **Expected**: Switch back to previous tab smoothly
8. Verify that arrow keys work from anywhere on the page (not just navbar)

### Test 6: Reduced Motion Support

**On macOS**:
1. System Settings → Accessibility → Display → Reduce motion (toggle ON)
2. Reload page
3. Click tabs and observe instant transitions (no animation)
4. Toggle OFF and verify animations return

**On Windows**:
1. Settings → Ease of Access → Display → Show animations (toggle OFF)
2. Reload page
3. Click tabs and observe instant transitions
4. Toggle ON and verify animations return

**On iOS**:
1. Settings → Accessibility → Motion → Reduce Motion (toggle ON)
2. Reload Safari
3. Tap tabs and observe instant transitions
4. Toggle OFF and verify animations return

**On Android**:
1. Developer Settings → Animation scale (set to 0)
2. Reload Chrome
3. Tap tabs and observe instant transitions
4. Set back to 1.0 and verify animations return

### Test 7: Performance Under Load

1. Open DevTools → Performance
2. Start recording
3. Rapidly click tabs back and forth 10 times
4. Stop recording
5. Analyze:
   - Total time: Should be ~2.6s (10 × 260ms)
   - Frame rate: Should never drop below 50fps
   - Long tasks: Should be none
   - Memory: Should not increase noticeably

### Test 8: Scrollbar Behavior

1. Scroll Portfolio page
2. Observe scrollbar on the right (should be subtle)
3. Hover over scrollbar
4. **Expected**: Scrollbar should become slightly darker
5. Switch to Comments and observe scrollbar
6. **Expected**: Scrollbar position should match Comments scroll (not Portfolio)

### Test 9: Visual Alignment

1. Open DevTools → Inspect Element
2. Click on the pill indicator
3. Check computed styles:
   - `will-change: transform` (should be present)
   - `transform: translate3d(...)` (should match tab position)
   - `width: ...px` (should match tab width)
4. Drag the swiper and inspect in real-time
5. **Expected**: Values should update continuously without flicker

### Test 10: Network Throttling (Desktop)

1. Open DevTools → Network tab
2. Click the throttle dropdown (usually says "No throttling")
3. Select "Slow 3G"
4. Reload page
5. Click tabs while throttled
6. **Expected**: Transitions should still be smooth (not affected by network)
7. Try "4G" throttle
8. **Expected**: Same smooth transitions

## Visual Inspection Checklist

### Colors
- [ ] Pill background is correct color (secondary)
- [ ] Active tab text is foreground color
- [ ] Inactive tab text is muted-foreground color
- [ ] Navbar background has appropriate blur/opacity

### Typography
- [ ] Tab text is readable at all sizes
- [ ] Font weight is consistent
- [ ] Letter spacing is consistent
- [ ] No text clipping or overflow

### Layout
- [ ] Pill indicator is always inside the tabs container
- [ ] Pills don't overlap other navbar elements
- [ ] Navbar height is consistent before/after transitions
- [ ] No layout shift when switching pages

### Animation Quality
- [ ] Opacity transitions are smooth (no step function)
- [ ] Scale transitions are imperceptible (very subtle)
- [ ] Pill position changes are smooth (not jumpy)
- [ ] No visible tearing or flickering

### Touch Targets
- [ ] Tab buttons are at least 44px tall on mobile
- [ ] Tab buttons are at least 24px wide on mobile
- [ ] Sufficient padding around touch targets
- [ ] No accidental triggers on swipe

## Common Issues & Solutions

### Issue: Pill indicator is misaligned
**Solution**: 
- Clear browser cache (Ctrl+Shift+Del)
- Hard refresh (Ctrl+F5)
- Check that DevTools zoom is 100%

### Issue: Transitions feel choppy
**Solution**:
- Check DevTools Performance tab for dropped frames
- Close other browser tabs
- Check if GPU acceleration is enabled
- Verify `will-change` properties are present

### Issue: Scroll doesn't restore
**Solution**:
- Ensure page has enough content to scroll
- Check that scroll containers are properly nested
- Verify `overflow-y: auto` is set on scroll container
- Check console for JavaScript errors

### Issue: Keyboard navigation doesn't work
**Solution**:
- Verify focus is on the page (not DevTools)
- Check that input fields don't intercept arrow keys
- Verify `tabindex` on navbar tabs
- Check console for keyboard event listeners

### Issue: Mobile swipe doesn't respond
**Solution**:
- Check `touch-action: pan-y` is set on body
- Verify pointer event listeners are attached
- Test on actual device (not just DevTools emulation)
- Check that no JavaScript is preventing default

### Issue: Pill indicator doesn't move during drag
**Solution**:
- Check that `getPagerIndexMV()` returns a value
- Verify Framer Motion is properly initialized
- Check that `will-change: transform` is present
- Verify CSS custom property `--pager-idx` is being updated

## Automated Testing Script

Save this to test in browser console:

```javascript
async function testTransitions() {
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Tab switching
  const portfolioBtn = document.querySelector('[role="tab"][aria-selected="false"]');
  const commentsBtn = document.querySelector('[role="tab"][aria-selected="true"]');
  
  if (!portfolioBtn || !commentsBtn) {
    results.failed++;
    results.errors.push("Tab buttons not found");
    return results;
  }

  // Test 2: Pill visibility
  const pill = document.querySelector('[role="tablist"] > span');
  if (!pill) {
    results.failed++;
    results.errors.push("Pill indicator not found");
  } else {
    results.passed++;
  }

  // Test 3: Transform property
  const transform = window.getComputedStyle(pill).transform;
  if (transform === 'none') {
    results.failed++;
    results.errors.push("Pill transform not applied");
  } else {
    results.passed++;
  }

  // Test 4: CSS variable
  const idx = getComputedStyle(document.documentElement)
    .getPropertyValue('--pager-idx');
  if (!idx) {
    results.failed++;
    results.errors.push("CSS variable --pager-idx not found");
  } else {
    results.passed++;
  }

  return results;
}

// Run the tests
testTransitions().then(console.log);
```

## Sign-Off Checklist

- [ ] All basic functionality tests pass
- [ ] Motion timing is correct (260ms)
- [ ] Scroll position is preserved
- [ ] Gestures work on mobile
- [ ] Keyboard navigation works
- [ ] Reduced motion is respected
- [ ] Performance is smooth (60fps)
- [ ] Visual appearance is polished
- [ ] No console errors
- [ ] Works on multiple browsers
- [ ] Responsive on all screen sizes
- [ ] Accessibility passes

Once all boxes are checked, the transition system is ready for production! ✅

---

**Last Updated**: 2026-04-25
**Status**: Production Ready
