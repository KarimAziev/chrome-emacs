# Atomic Chrome for Emacs

This fork of Atomic Chrome has been updated and improved with the following changes:

- Migration to Chrome Extension Manifest V3.
- Rewriting in TypeScript for improved stability and maintainability.

## Installation

To start using Emacs to edit in Chrome, you will need to setup the Chrome extension locally until it is published to the Chrome Web Store:

1. Clone the repository to your local machine.
2. Ensure that you have the correct version of Node.js installed. You can find the required version in the `.nvmrc` file in the repository. If you are using NVM (Node Version Manager), you can switch to the correct version with `nvm use`.
3. Run `npm install` to install all the required dependencies.
4. Build the extension by running `npm run build`.

Once the build process is complete, you'll have a `app` directory containing the built extension which can be loaded into Chrome:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner.
3. Click "Load unpacked" and select the `app` directory created by the build process.

Additionally, install the corresponding Emacs package from [this fork](https://github.com/KarimAziev/atomic-chrome) which contains improvements and updates.

## Usage

Ensure that Emacs is running with the `atomic-chrome` package loaded.

1. Focus on a textarea or a contenteditable element in Chrome.
2. Activate Atomic Chrome. This can typically be done by clicking on the extension's icon or using a keyboard shortcut.

The text will now open in an Emacs buffer, ready for you to edit.

### How do I bind a shortcut?

1. Navigate to `chrome://extensions`.
2. Scroll down and click 'Keyboard shortcuts' at the bottom of the page.
3. Assign a shortcut for activating Atomic Chrome.

## Development

This repository is dedicated to the Chrome extension development. For improvements to the Emacs integration and package, visit [the associated GitHub repository](https://github.com/KarimAziev/atomic-chrome).

Your contributions to both the Chrome extension and the Emacs package are welcome!
