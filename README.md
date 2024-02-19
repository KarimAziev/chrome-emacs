<div align="center">

![](./app/images/icon.png)

</div>

This is a [Chrome Extension](https://chromewebstore.google.com/detail/chrome-emacs/dabdpcafiblbndpoadckibiaojbdnpjg) focused on bi-directional editing in online text editors and text areas from within Emacs.

After the original Atomic Chrome extension was removed from the Chrome Web Store due to policy violations, I undertook the task of creating an entirely refreshed and compliant version. Now named "Chrome Emacs," represents more than just a fork; it is a comprehensive rewrite that adheres to the newest standards and Chrome Extension Manifest V3, ensuring both compliance and enhanced security.

Here are some of the major improvements and changes:

- **Complete Rewrite in TypeScript**: This enhances the extension's stability, maintainability, and performance.
- **Support for the Monaco Editor**: Expanding the range of compatible online editors far beyond the original.
- **Auto-Major Mode Detection**: Automatically configures the most suitable editing mode for any given online editor.
- **Migration to Chrome Extension Manifest V3**: Guarantees the extension stays compatible with the latest browser versions and meets the current security standards.

Through these efforts, "Chrome Emacs" not only preserves the core functionalities originally beloved by users but also introduces new features and optimizations—effectively making it a brand-new extension.

Chrome Emacs is compatible with several widely-used online editors, including:

- ☒ [codepen.io](https://codepen.io/)
- ☒ [stackblitz.com](https://stackblitz.com/)
- ☒ [jsfiddle.net](https://jsfiddle.net/)
- ☒ [leetcode.com](https://leetcode.com/)
- ☒ [hackerrank.com](https://www.hackerrank.com/)
- ☒ [repl.it](https://repl.it/)
- ☒ [glitch.com](https://glitch.com/)
- ☒ [plnkr.co](https://plnkr.co/)
- ☐ [codesandbox.io](https://codesandbox.io/) (Currently unsupported due to a lack of Monaco API exposure).

### Installation

#### Chrome Extension

Install the [Chrome extension](https://chromewebstore.google.com/detail/chrome-emacs/dabdpcafiblbndpoadckibiaojbdnpjg).

#### Emacs Integration

<details><summary> Install the corresponding Emacs package from <a href="https://github.com/KarimAziev/atomic-chrome">this fork</a>.
  </summary>

##### With use-package and straight.el

```emacs-lisp
(use-package atomic-chrome
  :demand t
  :straight (atomic-chrome
             :repo "KarimAziev/atomic-chrome"
             :type git
             :host github)
  :commands (atomic-chrome-start-server)
  :config (atomic-chrome-start-server))
```

##### Manual Installation

Download the source code and place it in your desired directory (e.g., `~/.emacs.d/atomic-chrome/`):

```
git clone https://github.com/KarimAziev/atomic-chrome.git ~/.emacs.d/atomic-chrome/
```

Add the downloaded directory to the load path and require it:

```emacs-lisp
(add-to-list 'load-path "~/.emacs.d/atomic-chrome/")
(require 'atomic-chrome)
(atomic-chrome-start-server)
```

</details>

### Usage

Ensure that Emacs is running with the [package](https://github.com/KarimAziev/atomic-chrome) loaded.

1. Focus on a textarea, text editor, or a contenteditable element in Chrome.
2. Activate Chrome Emacs. This can typically be done by clicking on the extension's icon or using a keyboard shortcut.

The text will now open in an Emacs buffer, ready for you to edit.

#### How do I bind a shortcut?

1. Navigate to `chrome://extensions`.
2. Scroll down and click on `Keyboard shortcuts` at the bottom of the page.
3. Assign a shortcut for activating Chrome Emacs.

#### Development

<details><summary>Local setup </summary>

1. Clone the repository to your local machine:
   ```
   git clone https://github.com/KarimAziev/chrome-emacs.git
   ```
2. Ensure the correct version of Node.js is installed, as specified in the =.nvmrc= file. Switch to the correct version with `nvm use`, if using NVM.
3. Install required dependencies:
   ```
   npm install
   ```
4. Build the extension:

- For rebuilding the extension on file save, run:
  ```
  npm run dev
  ```
- For a one-time build:
  ```
  npm run build
  ```

5. Load the built `app` directory into Chrome:
   - Navigate to `chrome://extensions/`
   - Toggle "Developer mode" at the top right.
   - Click "Load unpacked" and select the `app` directory.

</details>

Your contributions to both the Chrome extension and the Emacs package are welcome!
