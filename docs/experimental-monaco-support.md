# Experimental Monaco Support Documentation

This document outlines the support for experimental Monaco-like editor integrations within the Chrome Emacs extension, specifically for platforms like [codesandbox.com](https://codesandbox.io/) and [vscode.dev](https://www.vscode.dev/), where the Monaco editor's API is not globally exposed. This document outlines the implementation details, the rationale behind the approach, and key considerations for users.

## Implementation Overview

For web-based editors utilizing the Monaco Editor without direct API access the extension employs a sophisticated method of simulating user actions. This includes typing, navigation through keyboard event simulation, and direct DOM manipulation. This approach contrasts with our standard method for editors where the Monaco API is exposed, enabling more direct interaction.

### Features and Limitations

All real-time editing features, including scroll and selection synchronization from Emacs to the browser, are fully supported. The only unsupported feature is pushing changes from the browser to Emacs, but this is not a significant issue. Also, there may be some delay in retrieving the initial value, depending on the number of pages, as we need to iterate through every page to capture the full content.

### Key Challenges

- **Virtualization**: The Monaco editor only render visible lines in the DOM to enhance performance. This necessitates iterating through pages, capturing content, and moving on, which complicates direct value retrieval and real-time synchronization from the browser to Emacs.
- **User Action Simulation**: Due to the lack of direct API access, the extension simulates keyboard and clipboard events to interact with the editor. It requires precise timing and event handling to mimic the natural user experience accurately.

## Important Considerations

The functioning of this experimental feature relies on specific default keyboard shortcuts within Monaco-based editors. Changing these may impede the extension's ability to simulate actions correctly.

### Keyboard Shortcuts to Preserve in Browser

The following browser shortcuts must not be modified by the user to ensure proper operation of the extension within unsupported Monaco environments:

#### Essential for Setting Value:

- **`Ctrl+a` (`Cmd+a` on macOS)**: Selects all text within the editor. Necessary for replacing the editor's content.
- **`Delete`**: Deletes the selected text. Used in conjunction with select all for clearing the editor before setting new content.

#### Essential for Getting Value:

- **`Ctrl+Home` (`Cmd+Home` on macOS)**: Navigates to the document's beginning. Required for starting the content extraction process from the top.
- **`PageDown`**: Scrolls to the next page. Critical for iterating through and extracting the visible content of virtualized editors.

#### Essential for Cursor Synchronization:

- **`ArrowDown`**: Moves the cursor one line down.
- **`ArrowRight`**: Moves the cursor one character to the right.

#### Essential for Cursor Selection:

- **`Shift+ArrowUp`**
- **`Shift+ArrowLeft`**
- **`Shift+ArrowDown`**
- **`Shift+ArrowRight`**

**Rationale**: Altering these shortcuts could disrupt the extension's action simulation mechanisms, leading to issues with editing synchronization.

## Why is Retrieving Value Complex?

Retrieving text content from Monaco-like editors is particularly challenging due to virtualization. These editors only render visible lines in the DOM to improve performance, requiring a page-by-page extraction process to obtain the full content. This method involves scrolling through the editor, ensuring each page's content is visible, then extracting and compiling the text.

## Conclusion

Ensuring the outlined browser shortcuts remain default is vital for the successful integration of Chrome Emacs with Monaco-like editors on platforms such as `codesandbox.com` and `vscode.dev`. While the handling for setting and retrieving values, along with cursor synchronization and selection, is complex due to the need to simulate user actions and the virtualized nature of these editors, this approach enables real-time editing capabilities within these environments.
