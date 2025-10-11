# Changelog

## Version 1.0.3 (2025-10-03)

- Fixed an issue with editors that use the latest Monaco (e.g., Coderpad), which prevented detection of the element to edit.

## Version 1.0.2 (2025-10-02)

- Chrome: Same as [Version 1.0.0](#version-100-2025-10-01), but with fixes.

## Version 1.0.1 (2025-10-01)

- Firefox: Fixed an issue that caused marked text to reset in Emacs when used in Overleaf and other CodeMirror 6 editors.
- Chrome: Reverted Version 1.0.0 to Version 0.9.1. The fix will be included in Version 1.0.2.

## Version 1.0.0 (2025-10-01)

- Add support for collaborative editing in `Overleaf` and other editors based on `CodeMirror 6`. Previously, only changes from Emacs were visible to other collaborators, it now works both ways-remote edits are now reflected in Emacs as well. The cursor positions of other collaborators are no longer reset after changes made by Emacs. ([#9 issue](https://github.com/KarimAziev/chrome-emacs/issues/9) and [atomic-chrome issue](https://github.com/KarimAziev/atomic-chrome/issues/9))

> [!IMPORTANT]
> Please also update [atomic-chrome](https://github.com/KarimAziev/atomic-chrome) to the latest version. The old version will still work with all editors, but in CodeMirror 6 it causes issues with `iedit` and region marks.

## Version 0.9.1 (2025-07-14)

- Fixed simulated clicks for iframe environments. Previously, when using editors like TinyMCE embedded in iframes, simulated clicks would fail to locate elements outside the iframe, resulting in an "element not found" error. This update adjusts the search context to properly locate and click the intended button elements even when the editor is isolated within an iframe.

## Version 0.9.0 (2025-05-25)

- Added support for executing clicks on the elements defined by the user (for example, to click "Send" in Slack after editing). The list of allowed sites and elements' CSS selectors is described in the atomic-chrome [documentation](https://github.com/KarimAziev/atomic-chrome?tab=readme-ov-file#simulated-clicks-via-custom-rules).

## Version 0.8.0 (2025-02-04)

- Added support for `Slack` and other [Quill](https://quilljs.com/)-based editors.
- Now, changes you make in `Slack` and similar rich-text environments include the full inner HTML markup. This means that when you edit text, any formatting you applied—such as bold, italic, or structured line breaks—is preserved exactly as displayed. Previously, only the plain text might have been captured, sometimes resulting in lost or altered formatting. With this update, you can expect a more consistent and faithful editing experience that mirrors what you see on screen.

## Version 0.7.0 (2025-01-17)

- Added a context menu for editable elements.
- Added support for `TinyMCE` and other iframe-based editors.

## Version 0.6.0 (2024-12-02)

- Added support for `CKEditor 4` and `CKEditor 5`. Introduced bidirectional editing functionality, though scroll synchronization remains unsupported.
- Improved keyboard input handling for editable elements. Previously, hint key presses (used to navigate editable areas) could be intercepted by active elements such as rich text editors, resulting in missed actions. To resolve this, a temporary `textarea` mask is now dynamically positioned to intercept and handle hint keys correctly without interfering with the underlying editor.

## Version 0.5.2 (2024-08-21)

- Implemented a more native keep-alive mechanism for Firefox using the Alarms API to enhance the stability of background scripts.
- Removed redundant keep-alive logic from the content script, centralizing it in the background script.
- Updated the manifest to ensure appropriate permissions for the Alarms API in Firefox.

## Version 0.5.1 (2024-08-18)

- Added support for Firefox.
- Reduced the keep-alive interval in Firefox to 5 seconds to prevent disconnection during idle periods.

## Version 0.5.0 (UNPUBLISHED)

- Added support for Firefox.
- Updated build scripts and GitHub Actions workflow to handle builds and releases for both Chrome and Firefox versions.
- Improved handling and copying of icons using `copy-webpack-plugin`.
- Refactored `webpack.config.js` to dynamically set the target (Chrome or Firefox) and copy appropriate assets.
- Minor improvements and bug fixes.

## Version 0.4.0 (2024-04-18)

- Added an options page, which allows users to configure which letters to use for hints and exit keybindings.
- Pinned icons are now highlighted according to the tab.

## Version 0.3.1 (2024-04-03)

- Fixed an issue on some sites, such as [replit.com](https://replit.com), where editing failed due to weird ID attribute values in DOM elements. Although IDs that start with a digit are valid in HTML, they require special escaping in CSS selectors.

## Version 0.3.0 (2024-04-02)

- The main feature is the experimental support for `vscode.dev`, `codesandbox.io`, and other sites that do not globally expose the Monaco API. See [considerations](https://github.com/KarimAziev/chrome-emacs/blob/main/docs/experimental-monaco-support.md) here.
- Improved textarea editing. Previously, e.g., on GitHub, after editing, the submit button would remain disabled. Now, it correctly recognizes changes.
- Hints now also highlight and make editable areas clickable, further improving the recognition of editable areas.
- Added support for `coderpad.io`.

## Version 0.2.2 (2024-03-18)

- Manually configure file extensions for the `python` and `latex` languages in CodeMirror.
- Add a CodeMirror utility for language search with partial and fuzzy matching.

## Version 0.2.1 (2024-03-14)

- Added selection handling in the Ace editor.
- Fixed the Monaco editor issue with tab switching on some sites (e.g., StackBlitz).

## Version 0.2.0 (2024-03-12)

### New features:

- Cursor and selection synchronization.
- Support for auto-placing the Emacs frame.

### Changes:

- Changed the default shortcut for activating the extension to `Ctrl+Period` (on Mac, `Command+Period`).
- Changed the default shortcut for activating hints to `Ctrl+Shift+Period` (on Mac, `Command+Shift+Period`).

### Fixes:

- Fixed detection of the Monaco editor on some sites.
- Fixed mode detection in CodeMirror.
