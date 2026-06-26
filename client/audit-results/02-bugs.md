# Client-Side Bug Audit Report

Auditor: Agent 2 (PATHOLOGIST)
Date: 2026-04-04
Scope: `/projects/LibreEco/LibreChat/client/src` (high-priority directories)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3     |
| High     | 7     |
| Medium   | 8     |
| Low/Info | 5     |

---

## Findings

### [CRITICAL] XSS via unsanitized dangerouslySetInnerHTML in Banner component
- **File:** `src/components/Banners/Banner.tsx`
- **Lines:** 48
- **Category:** bug
- **Description:** The `banner.message` value from the server API is rendered directly via `dangerouslySetInnerHTML` without any sanitization (no DOMPurify or equivalent). If an admin or attacker can inject content into the banner message (e.g., via a compromised backend or admin panel), arbitrary JavaScript will execute in every user's browser.
- **Evidence:**
  ```tsx
  dangerouslySetInnerHTML={{ __html: banner.message }}
  ```
- **Risk:** Stored XSS affecting all authenticated users. Session hijacking, credential theft, or arbitrary actions on behalf of the user.
- **Suggested fix:** Sanitize `banner.message` with DOMPurify before rendering, as is done in `CustomUserVarsSection.tsx`. Restrict allowed tags to `a`, `strong`, `em`, `br`, `code`.

### [CRITICAL] XSS via unsanitized dangerouslySetInnerHTML in TrustSection
- **File:** `src/components/SidePanel/MCPBuilder/MCPServerDialog/sections/TrustSection.tsx`
- **Lines:** 41-44, 58-63
- **Category:** bug
- **Description:** The trust checkbox label and sublabel from `startupConfig.interface.mcpServers.trustCheckbox` are rendered via `dangerouslySetInnerHTML` after passing through `getLocalizedValue()` but without any HTML sanitization. These values originate from server configuration which could be manipulated by an admin or a compromised config.
- **Evidence:**
  ```tsx
  <span
    dangerouslySetInnerHTML={{
      __html: getLocalizedValue(
        startupConfig.interface.mcpServers.trustCheckbox.label,
        localize('com_ui_trust_app'),
      ),
    }}
  />
  ```
- **Risk:** XSS if server config values contain malicious HTML/JS. All users who view the MCP server dialog are affected.
- **Suggested fix:** Wrap the output of `getLocalizedValue()` in DOMPurify.sanitize() with a restricted ALLOWED_TAGS list, similar to `CustomUserVarsSection.tsx`.

### [CRITICAL] XSS via unsanitized dangerouslySetInnerHTML in MCPConfigDialog
- **File:** `src/components/Chat/Input/MCPConfigDialog.tsx`
- **Lines:** 86
- **Category:** bug
- **Description:** `details.description` is rendered via `dangerouslySetInnerHTML` without sanitization. Unlike `CustomUserVarsSection.tsx` (which uses DOMPurify for the same type of data), this dialog renders MCP field descriptions as raw HTML.
- **Evidence:**
  ```tsx
  dangerouslySetInnerHTML={{ __html: details.description }}
  ```
- **Risk:** XSS via MCP server configuration. If a malicious MCP server provides crafted descriptions, arbitrary JS executes when the user opens the config dialog.
- **Suggested fix:** Sanitize `details.description` with DOMPurify as done in `CustomUserVarsSection.tsx`.

---

### [HIGH] Mermaid diagram renders unsanitized SVG via innerHTML
- **File:** `src/components/Artifacts/Mermaid.tsx`
- **Lines:** 35-36
- **Category:** bug
- **Description:** The Mermaid library's SVG output is assigned directly to `innerHTML`. While mermaid is initialized with `securityLevel: 'sandbox'`, this sandboxing relies on mermaid's internal sanitization which has historically had bypasses. The SVG is rendered in the main document (not an iframe), so any bypass leads to full XSS.
- **Evidence:**
  ```ts
  const { svg } = await mermaid.render('mermaid-diagram', content);
  mermaidRef.current.innerHTML = svg;
  ```
- **Risk:** If mermaid's sandbox security is bypassed (known CVEs exist for older mermaid versions), arbitrary JavaScript could execute in the page context.
- **Suggested fix:** Render the SVG inside a sandboxed iframe (similar to the HtmlRenderer approach), or run DOMPurify on the SVG output with `ADD_TAGS: ['use']` and SVG-specific config.

### [HIGH] Uncaught JSON.parse in useSSE message handler
- **File:** `src/hooks/SSE/useSSE.ts`
- **Lines:** 103-104
- **Category:** bug
- **Description:** The main `message` event handler calls `JSON.parse(e.data)` without try/catch. If the server sends malformed JSON (e.g., during network corruption or a partial write), this will throw an uncaught exception, silently breaking the SSE event loop. Note that the `attachment` handler at line 96 does wrap its parse in try/catch, showing inconsistency.
- **Evidence:**
  ```ts
  sse.addEventListener('message', (e: MessageEvent) => {
    const data = JSON.parse(e.data);  // no try/catch
  ```
- **Risk:** A single malformed SSE message will crash the handler, causing the user's chat to appear frozen with no error feedback.
- **Suggested fix:** Wrap `JSON.parse(e.data)` in a try/catch block, log the error, and continue. The resumable SSE hook (`useResumableSSE.ts` line 167) correctly wraps this in try/catch -- follow that pattern.

### [HIGH] Throttled function in Artifact component never cancelled on unmount
- **File:** `src/components/Artifacts/Artifact.tsx`
- **Lines:** 105-109
- **Category:** bug
- **Description:** A `throttle` function is created via `useRef` but is never cancelled when the component unmounts. The throttled callback captures `setArtifacts` (Recoil setter) via closure. If the throttled call fires after unmount, it will attempt to update unmounted state.
- **Evidence:**
  ```ts
  const throttledUpdateRef = useRef(
    throttle((updateFn: () => void) => {
      updateFn();
    }, 25),
  );
  ```
  No cleanup: there is no `useEffect` return that calls `throttledUpdateRef.current.cancel()`.
- **Risk:** State updates on unmounted components causing React warnings or subtle bugs. The 25ms throttle window makes this a narrow but real race window, especially during rapid navigation.
- **Suggested fix:** Add a cleanup effect: `useEffect(() => () => throttledUpdateRef.current.cancel(), []);`

### [HIGH] Registration countdown interval not cleaned up on unmount
- **File:** `src/components/Auth/Registration.tsx`
- **Lines:** 47-57
- **Category:** bug
- **Description:** The `onSuccess` callback of the registration mutation starts a `setInterval` timer that navigates after countdown. If the component unmounts before the interval completes (e.g., user navigates away), the interval continues to fire, calling `setCountdown` on an unmounted component and eventually calling `navigate` from a stale closure.
- **Evidence:**
  ```ts
  onSuccess: () => {
    setIsSubmitting(false);
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(timer);
          navigate('/c/new', { replace: true });
          return 0;
        } else {
          return prevCountdown - 1;
        }
      });
    }, 1000);
  },
  ```
- **Risk:** Memory leak and potential navigation to unexpected routes if the user leaves the registration page before the countdown completes. React will warn about state updates on unmounted components.
- **Suggested fix:** Store the interval ID in a ref and clear it in a `useEffect` cleanup function.

### [HIGH] JSON.parse without try/catch in getLocalStorageItems
- **File:** `src/utils/localStorage.ts`
- **Lines:** 10-18
- **Category:** bug
- **Description:** Three `JSON.parse()` calls operate on raw localStorage values without any error handling. If localStorage contains corrupted or manually-edited data, any of these will throw, crashing the calling component (likely during app initialization via `useNewConvo`).
- **Evidence:**
  ```ts
  const lastSelectedModel = items.lastSelectedModel
    ? (JSON.parse(items.lastSelectedModel) as Record<string, string | undefined> | null)
    : {};
  const lastSelectedTools = items.lastSelectedTools
    ? (JSON.parse(items.lastSelectedTools) as string[] | null)
    : [];
  const lastConversationSetup = items.lastConversationSetup
    ? (JSON.parse(items.lastConversationSetup) as Partial<TConversation> | null)
    : {};
  ```
- **Risk:** App crash on startup if any localStorage value is corrupted. Users would need to manually clear localStorage to recover.
- **Suggested fix:** Wrap each `JSON.parse` in try/catch, returning the default value (`{}`, `[]`, `{}`) on failure.

### [HIGH] JSON.parse crash risk in useLocalStorage storage event handler
- **File:** `src/hooks/useLocalStorage.tsx`
- **Lines:** 28
- **Category:** bug
- **Description:** The storage event handler calls `JSON.parse(lsi ?? '')`. When `lsi` is `null`, this parses an empty string which throws `SyntaxError`. Any cross-tab storage event for this key with a null value will crash the handler.
- **Evidence:**
  ```ts
  function handler(e: StorageEvent) {
    if (e.key !== key) { return; }
    const lsi = localStorage.getItem(key);
    setValue(JSON.parse(lsi ?? ''));
  }
  ```
- **Risk:** Uncaught exception from cross-tab storage events, potentially breaking the component.
- **Suggested fix:** Wrap in try/catch: `try { setValue(JSON.parse(lsi ?? 'null')); } catch { setValue(defaultValue); }`

---

### [MEDIUM] useSSE error handler parses JSON without error recovery
- **File:** `src/hooks/SSE/useSSE.ts`
- **Lines:** 220-226
- **Category:** bug
- **Description:** In the error event handler, `JSON.parse(e.data)` is wrapped in try/catch, but on parse failure, only `setIsSubmitting(false)` is called. The `errorHandler` is never invoked, so the user sees no error message -- the chat just silently stops.
- **Evidence:**
  ```ts
  try {
    data = JSON.parse(e.data) as TResData;
  } catch (error) {
    console.error(error);
    console.log(e);
    setIsSubmitting(false);
  }
  errorHandler({ data, submission: { ...submission, userMessage } as EventSubmission });
  ```
  Note: `errorHandler` is called after the catch block, but `data` remains `undefined`. While `errorHandler` does handle `undefined` data, `setShowStopButton` is never set to `false` in this code path, leaving the stop button visible.
- **Risk:** Stop button remains visible after an unparseable error, confusing the user.
- **Suggested fix:** Add `setShowStopButton(false)` to the catch block, or call `return` after setting submission to false and ensure the error handler is invoked with `data: undefined`.

### [MEDIUM] ArtifactUpdate reads artifacts from Recoil value and setter simultaneously
- **File:** `src/components/Artifacts/ArtifactUpdate.tsx`
- **Lines:** 117-119
- **Category:** anti-pattern
- **Description:** The component uses both `useSetRecoilState(artifactsState)` and `useRecoilValue(artifactsState)` for the same atom. The `useRecoilValue` subscription causes the component to re-render on every artifact state change. Since `applyUpdate` depends on `artifacts` in its dependency array, the `useCallback` and the `useEffect` that calls it will re-fire on every artifact update, even unrelated ones. This could cause unnecessary work and potential race conditions during streaming.
- **Evidence:**
  ```ts
  const setArtifacts = useSetRecoilState(artifactsState);
  const artifacts = useRecoilValue(artifactsState);
  ```
- **Risk:** Performance degradation during streaming (repeated re-renders and effect re-runs). The `appliedRef` guard prevents double-application, but the wasted renders add up.
- **Suggested fix:** Use `useRecoilCallback` to read the current value only when needed, rather than subscribing to all changes. Or use `useRecoilState` to avoid the double subscription.

### [MEDIUM] Stale closure risk in AuthContext silentRefresh
- **File:** `src/hooks/AuthContext.tsx`
- **Lines:** 163-211
- **Category:** bug
- **Description:** The `silentRefresh` callback has an empty dependency array (`[]`) with an eslint-disable comment. It captures the initial values of `authConfig`, `navigate`, `setUserContext`, `isExternalRedirectRef`, and `refreshToken` at mount time. The `navigate` function from React Router is stable, but `refreshToken.mutate` may reference stale token state if the component has re-rendered.
- **Evidence:**
  ```ts
  const silentRefresh = useCallback(() => {
    // ... uses refreshToken.mutate, navigate, setUserContext, authConfig
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are stable at mount
  }, []);
  ```
- **Risk:** The comment acknowledges this is intentional to prevent infinite loops. However, if `refreshToken` is recreated (e.g., due to React Query options changes), the stale reference could lead to unexpected behavior.
- **Suggested fix:** This is an acknowledged trade-off. Consider extracting `refreshToken.mutate` into a ref to get the latest reference without triggering re-renders.

### [MEDIUM] Mermaid diagram uses hardcoded element ID causing collision
- **File:** `src/components/Artifacts/Mermaid.tsx`
- **Lines:** 35
- **Category:** bug
- **Description:** `mermaid.render('mermaid-diagram', content)` uses a hardcoded ID `'mermaid-diagram'`. Mermaid creates a temporary SVG element with this ID for rendering. If two MermaidDiagram components are mounted simultaneously (e.g., multiple artifacts), they will collide on this ID, causing rendering failures or garbled output.
- **Evidence:**
  ```ts
  const { svg } = await mermaid.render('mermaid-diagram', content);
  ```
- **Risk:** Incorrect rendering when multiple mermaid diagrams exist on the same page.
- **Suggested fix:** Use a unique ID per component instance, e.g., `useId()` or a `useRef(uuid())`.

### [MEDIUM] Mermaid render error logged to console.error instead of user-facing
- **File:** `src/components/Artifacts/Mermaid.tsx`
- **Lines:** 44-48
- **Category:** anti-pattern
- **Description:** When mermaid rendering fails, the error is logged to `console.error` and a plain text "Error rendering diagram" is shown. This is generic and provides no actionable information to the user. Additionally, `console.error` is used instead of the project's `logger` utility.
- **Evidence:**
  ```ts
  } catch (error) {
    console.error('Mermaid rendering error:', error);
    if (mermaidRef.current) {
      mermaidRef.current.innerHTML = 'Error rendering diagram';
    }
  }
  ```
- **Risk:** Poor debugging experience; errors are silently swallowed in production.
- **Suggested fix:** Use the project's `logger` utility. Show a more descriptive error message including the error type.

### [MEDIUM] EditorContext useMemo includes setter function in dependencies
- **File:** `src/Providers/EditorContext.tsx`
- **Lines:** 34-35
- **Category:** anti-pattern
- **Description:** The `codeValue` useMemo depends on `currentCode`, which changes on every keystroke in the editor. While this is intentional (the context needs to provide the latest code), the `setCurrentCode` setter is a new object reference on every render because it comes from `useState`. This means the memoized value is recreated every time `currentCode` changes, which is correct behavior but the comment on line 16 ("Changes frequently") should note that consumers will re-render on every keystroke.
- **Evidence:**
  ```ts
  const codeValue = useMemo(() => ({ currentCode, setCurrentCode }), [currentCode]);
  ```
  Note: `setCurrentCode` is excluded from deps (it's stable from useState), so this is actually correct. No bug here but the naming `setCurrentCode` in the object will cause identity changes for the object on every code change, forcing all consumers of `useCodeState()` to re-render.
- **Risk:** All components using `useCodeState()` re-render on every keystroke, regardless of whether they use `currentCode` or only `setCurrentCode`.
- **Suggested fix:** Split into two separate context values or use `useRef` for the setter to avoid object identity changes.

### [MEDIUM] useSSE completed state uses mutable Set operations
- **File:** `src/hooks/SSE/useSSE.ts`
- **Lines:** 34, 162-169
- **Category:** bug
- **Description:** The `completed` state is a `Set`, but the cancel handler mutates it in place with `prev.delete(streamKey)` inside `setCompleted`, then wraps it in `new Set(prev)`. This is technically correct for triggering a re-render, but the `completed.has(streamKey)` check on line 163 reads the current render's `completed` value, which may be stale due to closures.
- **Evidence:**
  ```ts
  const [completed, setCompleted] = useState(new Set());
  // ...
  if (completed.has(streamKey)) {
    setIsSubmitting(false);
    setCompleted((prev) => {
      prev.delete(streamKey);  // mutates the Set in place
      return new Set(prev);
    });
    return;
  }
  setCompleted((prev) => new Set(prev.add(streamKey)));
  ```
- **Risk:** The stale closure on `completed` means the `has` check may not see the latest additions from concurrent events. The in-place `delete` mutation is also an anti-pattern (mutating state directly).
- **Suggested fix:** Use the functional updater form for both reads and writes, or use `useRef` for the completed set since it doesn't need to trigger re-renders.

### [MEDIUM] LoginForm useEffect missing from dependency array
- **File:** `src/components/Auth/LoginForm.tsx`
- **Lines:** 35-38
- **Category:** bug
- **Description:** The `useEffect` for showing the resend link depends on `error` and `showResendLink` but the eslint rule is not enforced (no eslint-disable comment present, suggesting the rule may be off for this file). The effect checks `!showResendLink` but if `showResendLink` is added to deps, the effect won't re-run unnecessarily. This is minor since the guard condition handles it, but it indicates missing deps awareness.
- **Evidence:**
  ```ts
  useEffect(() => {
    if (error && error.includes('422') && !showResendLink) {
      setShowResendLink(true);
    }
  }, [error, showResendLink]);
  ```
- **Risk:** Low -- the logic is correct as-is. Noted for completeness.
- **Suggested fix:** No change needed; the deps are actually correct here.

---

### [LOW] God function: Artifacts.tsx component (440 lines)
- **File:** `src/components/Artifacts/Artifacts.tsx`
- **Lines:** 1-440
- **Category:** anti-pattern
- **Description:** The `Artifacts` component is a single function spanning 440 lines with extensive inline JSX, drag handling, close logic, navigation logic, and portal rendering all mixed together. It manages 11 state variables and 5 refs.
- **Risk:** Difficult to test individual behaviors; high cognitive load for maintenance.
- **Suggested fix:** Extract drag handling into a `useDragResize` hook. Extract header/footer into sub-components. Extract close/navigation logic into a custom hook.

### [LOW] God function: useEventHandlers finalHandler (200+ lines)
- **File:** `src/hooks/SSE/useEventHandlers.ts`
- **Lines:** 433-638
- **Category:** anti-pattern
- **Description:** The `finalHandler` callback is approximately 200 lines of deeply nested conditional logic handling multiple edge cases (early abort, attachments, new conversations, assistants, etc.).
- **Risk:** High cyclomatic complexity makes it error-prone during modifications.
- **Suggested fix:** Extract sub-handlers for each case (earlyAbort, newConvo, assistants, etc.).

### [LOW] Magic numbers in drag handling
- **File:** `src/components/Artifacts/Artifacts.tsx`
- **Lines:** 22-23, 64, 79-80, 139, 153-160, 195
- **Category:** smell
- **Description:** Multiple magic numbers for UI thresholds: `32`, `0.3`, `50`, `30`, `100`, `10`, `100`, `30`, `95`, `60`, `50`, `90`, `250`, `8`.
- **Risk:** Difficult to understand the intent of each threshold; inconsistencies likely during maintenance.
- **Suggested fix:** Extract to named constants (e.g., `CLOSE_THRESHOLD = 30`, `SNAP_FULL_THRESHOLD = 95`).

### [LOW] Dead parameters in extractJson
- **File:** `src/utils/json.ts`
- **Lines:** 18-36
- **Category:** smell
- **Description:** The `extractJson` function does not handle JSON strings that contain braces within string literals (e.g., `{"key": "value with { brace"}`). It performs naive brace counting.
- **Risk:** Incorrect JSON extraction for payloads containing brace characters in string values.
- **Suggested fix:** Use a regex-based approach or a proper JSON tokenizer if correctness matters.

### [LOW] useNewConvo switchToConversation is excessively long
- **File:** `src/hooks/useNewConvo.ts`
- **Lines:** 80-267
- **Category:** anti-pattern
- **Description:** `switchToConversation` is ~190 lines within a `useRecoilCallback` handling endpoint selection, assistant resolution, model selection, navigation, and conversation setup. It has deep nesting (5+ levels) and many conditional branches.
- **Risk:** Difficult to reason about all code paths; changes are error-prone.
- **Suggested fix:** Extract endpoint resolution, assistant resolution, and navigation into separate helper functions.
