# Chrome Emacs

Chrome Emacs is a Chrome Extension that allows you to use Emacs for editing text seamlessly.

Differences from the original Atomic Chrome extension:

- **Migration to Chrome Extension Manifest V3**: Ensures up-to-date compatibility and security.
- **Monaco Editor Support**: Expands the range of supported online editors.
- **TypeScript Rewrite**: For enhanced stability, maintainability, and performance.

## Online Editors Support

Chrome Emacs works with several widely-used online editors, including:

- [x] [codepen.io](https://codepen.io/)
- [x] [stackblitz.com](https://stackblitz.com/)
- [x] [jsfiddle.net](https://jsfiddle.net/)
- [x] [leetcode.com](https://leetcode.com/)
- [x] [hackerrank.com](https://www.hackerrank.com/)
- [x] [repl.it](https://repl.it/)
- [x] [glitch.com](https://glitch.com/)
- [ ] [codesandbox.io](https://codesandbox.io/) (Currently unsupported due to a lack of Monaco API exposure).

## Installation

To start using Chrome Emacs, follow these steps to set up the extension locally (until it is published to the Chrome Web Store):

1. Clone the repository to your local machine.
2. Ensure you have the correct version of Node.js installed, as specified in the `.nvmrc` file in the repository. If you're using NVM (Node Version Manager), switch to the correct version with `nvm use`.
3. Run `npm install` to install all required dependencies.
4. Build the extension by running `npm run build`.

Once the build process is complete, you'll have an `app` directory containing the built extension, which can be loaded into Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top-right corner.
3. Click "Load unpacked" and select the `app` directory created by the build process.

Additionally, install the corresponding Emacs package from [this fork](https://github.com/KarimAziev/atomic-chrome), which contains improvements and updates.

## Usage

Ensure that Emacs is running with the `atomic-chrome` package loaded.

1. Focus on a textarea or a contenteditable element in Chrome.
2. Activate Chrome Emacs. This can typically be done by clicking on the extension's icon or using a keyboard shortcut.

The text will now open in an Emacs buffer, ready for you to edit.

### How do I bind a shortcut?

1. Navigate to `chrome://extensions`.
2. Scroll down and click 'Keyboard shortcuts' at the bottom of the page.
3. Assign a shortcut for activating Chrome Emacs.

## Development

This repository is dedicated to the development of the Chrome extension. For improvements to the Emacs integration and package, visit [the associated GitHub repository](https://github.com/KarimAziev/atomic-chrome).

Your contributions to both the Chrome extension and the Emacs package are welcome!
