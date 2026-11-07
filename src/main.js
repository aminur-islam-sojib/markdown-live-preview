import Storehouse from 'storehouse-js';
import * as monaco from 'monaco-editor';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { sanitizeHtml } from './parser/sanitizer';
import { AutosaveManager, debounce } from './storage/autosave';
import {
    downloadFile,
    deriveFilename,
    generateHtmlDocument,
    isMarkdownFile,
    readFileAsText
} from './export/file-io';
import { isSupabaseConfigured } from './supabase/client';
import {
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    signInWithOtp,
    signOut as supabaseSignOut,
    onAuthStateChange
} from './supabase/auth';
import {
    listCloudDocuments,
    getCloudDocument,
    createCloudDocument,
    updateCloudDocument,
    deleteCloudDocument
} from './supabase/documents';

const init = () => {
    let hasEdited = false;
    let scrollBarSync = false;
    let currentUser = null;
    let currentCloudDocId = null;

    const deriveTitle = (markdown) => {
        const match = markdown.match(/^#\s+(.+)$/m);
        return match && match[1] ? match[1].trim() : 'Untitled Document';
    };

    const saveStatusElement = document.querySelector('#save-status');
    const updateSaveStatus = (status) => {
        if (!saveStatusElement) return;
        switch (status) {
            case 'saving':
                saveStatusElement.textContent = 'Saving...';
                break;
            case 'saved':
                saveStatusElement.textContent = currentCloudDocId ? 'Saved (Cloud)' : 'Saved';
                break;
            case 'unavailable':
                saveStatusElement.textContent = 'Offline (unsaved)';
                break;
            case 'error':
                saveStatusElement.textContent = 'Save failed';
                break;
        }
    };

    const syncToCloud = debounce(async (content) => {
        if (!currentUser || !currentCloudDocId) return;
        if (saveStatusElement) {
            saveStatusElement.textContent = 'Syncing...';
        }
        const updated = await updateCloudDocument(currentCloudDocId, {
            content,
            title: deriveTitle(content)
        });
        if (saveStatusElement) {
            saveStatusElement.textContent = updated ? 'Saved (Cloud)' : 'Cloud sync failed';
        }
    }, 600);

    const autosaveManager = new AutosaveManager({
        debounceMs: 300,
        onStatusChange: updateSaveStatus
    });

    const localStorageNamespace = 'com.markdownlivepreview';
    const localStorageKey = 'last_state';
    const localStorageScrollBarKey = 'scroll_bar_settings';
    const localStorageThemeKey = 'theme_settings';
    const confirmationMessage = 'Are you sure you want to reset? Your changes will be lost.';
    let mermaidRenderTimer = null;
    let mermaidRenderVersion = 0;
    // default template
    const defaultInput = `# Markdown syntax guide

## Headers

# This is a Heading h1
## This is a Heading h2
###### This is a Heading h6

## Emphasis

*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__

_You **can** combine them_

## Lists

### Unordered

* Item 1
* Item 2
* Item 2a
* Item 2b
    * Item 3a
    * Item 3b

### Ordered

1. Item 1
2. Item 2
3. Item 3
    1. Item 3a
    2. Item 3b

## Images

![This is an alt text.](/image/Markdown-mark.svg "This is a sample image.")

## Links

You may be using [Markdown Live Preview](https://markdownlivepreview.com/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

${"`"}${"`"}${"`"}
let message = 'Hello world';
alert(message);
${"`"}${"`"}${"`"}

## Mermaid diagrams
${"`"}${"`"}${"`"}mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Finish]
  B -->|No| D[Alternate]
${"`"}${"`"}${"`"}

## Inline code

This web site is using ${"`"}markedjs/marked${"`"}.
`;

    self.MonacoEnvironment = {
        getWorker(_, label) {
            return new Proxy({}, { get: () => () => { } });
        }
    }

    let setupEditor = () => {
        let editor = monaco.editor.create(document.querySelector('#editor'), {
            fontSize: 14,
            language: 'markdown',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            wordWrap: 'on',
            hover: { enabled: false },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            folding: false
        });

        const debouncedConvert = debounce((val) => {
            convert(val);
        }, 150);

        editor.onDidChangeModelContent(() => {
            let changed = editor.getValue() != defaultInput;
            if (changed) {
                hasEdited = true;
            }
            let value = editor.getValue();
            debouncedConvert(value);
            autosaveManager.save(value);
            if (currentUser && currentCloudDocId) {
                syncToCloud(value);
            }
        });

        editor.onDidScrollChange((e) => {
            if (!scrollBarSync) {
                return;
            }

            const scrollTop = e.scrollTop;
            const scrollHeight = e.scrollHeight;
            const height = editor.getLayoutInfo().height;

            const maxScrollTop = scrollHeight - height;
            const scrollRatio = scrollTop / maxScrollTop;

            let previewElement = document.querySelector('#preview');
            let targetY = (previewElement.scrollHeight - previewElement.clientHeight) * scrollRatio;
            previewElement.scrollTo(0, targetY);
        });

        return editor;
    };

    let escapeHtml = (value) => {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    let createMarkedRenderer = () => {
        const renderer = new marked.Renderer();
        const renderCode = renderer.code.bind(renderer);

        renderer.code = (token) => {
            const lang = (token.lang || '').match(/^\S*/)?.[0].toLowerCase();
            if (lang !== 'mermaid') {
                return renderCode(token);
            }

            return `<pre class="mermaid">${escapeHtml(token.text)}</pre>\n`;
        };

        return renderer;
    };

    let configureMermaid = (theme) => {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme,
            suppressErrorRendering: true,
        });
    };

    let showMermaidError = (element, error) => {
        const message = error && error.message ? error.message : 'Unable to render Mermaid chart.';
        element.classList.add('mermaid-error');
        element.textContent = `Mermaid render error: ${message}`;
    };

    let getMermaidTheme = () => {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
    };

    let renderMermaidDiagramsNow = async (theme = getMermaidTheme()) => {
        const outputElement = document.querySelector('#output');
        if (!outputElement) {
            return;
        }

        const version = ++mermaidRenderVersion;
        configureMermaid(theme);

        const elements = Array.from(outputElement.querySelectorAll('.mermaid'));
        for (const [index, element] of elements.entries()) {
            if (version !== mermaidRenderVersion) {
                return;
            }

            const source = element.dataset.mermaidSource || element.textContent;
            element.dataset.mermaidSource = source;
            element.classList.remove('mermaid-error');

            try {
                const renderId = `mermaid-${Date.now()}-${version}-${index}`;
                const { svg, bindFunctions } = await mermaid.render(renderId, source, element);
                if (version !== mermaidRenderVersion) {
                    return;
                }
                element.innerHTML = svg;
                if (typeof bindFunctions === 'function') {
                    bindFunctions(element);
                }
            } catch (error) {
                showMermaidError(element, error);
            }
        }
    };

    let scheduleMermaidRender = () => {
        if (mermaidRenderTimer) {
            clearTimeout(mermaidRenderTimer);
        }

        mermaidRenderTimer = setTimeout(() => {
            mermaidRenderTimer = null;
            renderMermaidDiagramsNow();
        }, 150);
    };

    let renderMermaidDiagrams = (theme) => {
        if (mermaidRenderTimer) {
            clearTimeout(mermaidRenderTimer);
            mermaidRenderTimer = null;
        }

        return renderMermaidDiagramsNow(theme);
    };

    let renderer = createMarkedRenderer();

    // Render markdown text as html
    let convert = (markdown) => {
        let options = {
            headerIds: false,
            mangle: false,
            renderer
        };
        let html = marked.parse(markdown, options);
        let sanitized = sanitizeHtml(html);
        document.querySelector('#output').innerHTML = sanitized;
        scheduleMermaidRender();
    };

    // Reset input text
    let reset = () => {
        let changed = editor.getValue() != defaultInput;
        if (hasEdited || changed) {
            var confirmed = window.confirm(confirmationMessage);
            if (!confirmed) {
                return;
            }
        }
        presetValue(defaultInput);
        autosaveManager.saveImmediately(defaultInput);
        document.querySelectorAll('.column').forEach((element) => {
            element.scrollTo({ top: 0 });
        });
    };

    let presetValue = (value) => {
        editor.setValue(value);
        editor.revealPosition({ lineNumber: 1, column: 1 });
        editor.focus();
        convert(value);
        hasEdited = false;
    };

    // ----- sync scroll position -----

    let initScrollBarSync = (settings) => {
        let checkbox = document.querySelector('#sync-scroll-checkbox');
        checkbox.checked = settings;
        scrollBarSync = settings;

        checkbox.addEventListener('change', (event) => {
            let checked = event.currentTarget.checked;
            scrollBarSync = checked;
            saveScrollBarSettings(checked);
        });
    };

    // ----- preview CSS loader (switch github-markdown css) -----
    const PREVIEW_CSS_LIGHT = 'css/github-markdown-light.css?v=a1a198514565';
    const PREVIEW_CSS_DARK = 'css/github-markdown-dark_dimmed.css?v=5d3f5d9d207c';

    let setPreviewCss = (useDark) => {
        const link = document.getElementById('gh-markdown-link');
        const desired = useDark ? PREVIEW_CSS_DARK : PREVIEW_CSS_LIGHT;
        if (!link) {
            const newLink = document.createElement('link');
            newLink.id = 'gh-markdown-link';
            newLink.rel = 'stylesheet';
            newLink.href = desired;
            document.head.appendChild(newLink);
            return new Promise((resolve) => {
                newLink.addEventListener('load', resolve, { once: true });
                newLink.addEventListener('error', resolve, { once: true });
            });
        }

        if (link.getAttribute('href') === desired) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
            link.setAttribute('href', desired);
        });
    };

    // ----- theme toggle (dark/light) -----
    let setTheme = (enabled) => {
        document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
    };

    let initThemeToggle = (settings) => {
        let checkbox = document.querySelector('#theme-checkbox');
        if (!checkbox) return;
        checkbox.checked = settings;
        setTheme(settings);

        // set Monaco editor theme to match page theme
        if (monaco && monaco.editor && typeof monaco.editor.setTheme === 'function') {
            monaco.editor.setTheme(settings ? 'vs-dark' : 'vs');
        }
        // set preview css to match theme
        setPreviewCss(settings);

        checkbox.addEventListener('change', (event) => {
            let checked = event.currentTarget.checked;
            setTheme(checked);
            saveThemeSettings(checked);
            setPreviewCss(checked);
            if (monaco && monaco.editor && typeof monaco.editor.setTheme === 'function') {
                monaco.editor.setTheme(checked ? 'vs-dark' : 'vs');
            }
            renderMermaidDiagrams();
        });
    };

    let enableScrollBarSync = () => {
        scrollBarSync = true;
    };

    let disableScrollBarSync = () => {
        scrollBarSync = false;
    };

    // ----- clipboard utils -----

    let copyToClipboard = (text, successHandler, errorHandler) => {
        navigator.clipboard.writeText(text).then(
            () => {
                successHandler();
            },

            () => {
                errorHandler();
            }
        );
    };

    let notifyCopied = () => {
        let labelElement = document.querySelector("#copy-button a");
        labelElement.innerHTML = "Copied!";
        setTimeout(() => {
            labelElement.innerHTML = "Copy";
        }, 1000)
    };

    // ----- export preview -----

    let restoreMermaidThemeAfterPrint = (theme) => {
        const printMedia = window.matchMedia('print');
        let printSessionStarted = false;

        const cleanup = () => {
            printMedia.removeEventListener('change', handlePrintMediaChange);
        };

        const handlePrintMediaChange = (event) => {
            if (event.matches) {
                printSessionStarted = true;
                return;
            }

            if (!printSessionStarted) {
                return;
            }

            cleanup();
            renderMermaidDiagrams(theme);
        };

        printMedia.addEventListener('change', handlePrintMediaChange);
        return cleanup;
    };

    let exportPreviewToPdf = () => {
        const currentTheme = getMermaidTheme();
        const printTheme = 'default';

        const cleanupPrintThemeListener = currentTheme === 'dark'
            ? restoreMermaidThemeAfterPrint(currentTheme)
            : null;

        renderMermaidDiagrams(printTheme).then(() => {
            window.print();
        }).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Failed to prepare PDF export', error);
            if (currentTheme === 'dark') {
                cleanupPrintThemeListener();
                renderMermaidDiagrams(currentTheme);
            }
            window.alert('Unable to prepare the print preview. Please try again.');
        });
    };

    // ----- setup -----

    // setup navigation actions
    let setupOpenButton = () => {
        const button = document.querySelector('#open-button');
        const input = document.querySelector('#open-file-input');

        button.addEventListener('click', () => {
            input.click();
        });

        input.addEventListener('change', async () => {
            const file = input.files[0];
            // Allow the same file to be selected again, including after a failed read.
            input.value = '';
            if (!file) return;

            button.disabled = true;
            let content;
            try {
                content = await file.text();
            } catch (error) {
                window.alert('Unable to read this file. Please try again.');
                return;
            } finally {
                button.disabled = false;
            }

            presetValue(content);
            autosaveManager.saveImmediately(content);
            document.querySelector('#preview').scrollTo({ top: 0 });
        });
    };

    let setupResetButton = () => {
        document.querySelector("#reset-button").addEventListener('click', (event) => {
            event.preventDefault();
            reset();
        });
    };

    let setupCopyButton = (editor) => {
        document.querySelector("#copy-button").addEventListener('click', (event) => {
            event.preventDefault();
            let value = editor.getValue();
            copyToClipboard(value, () => {
                notifyCopied();
            },
                () => {
                    // nothing to do
                });
        });
    };

    let setupExportMenu = (editor) => {
        const dropdown = document.querySelector('#export-dropdown');
        const dropdownBtn = document.querySelector('#export-dropdown-btn');
        const dropdownContent = document.querySelector('#export-dropdown-content');
        const exportMdBtn = document.querySelector('#export-md-btn');
        const exportHtmlBtn = document.querySelector('#export-html-btn');
        const exportPdfBtn = document.querySelector('#export-pdf-btn');

        if (!dropdown || !dropdownBtn || !dropdownContent) {
            return;
        }

        const closeDropdown = () => {
            dropdownContent.classList.remove('show');
            dropdownBtn.setAttribute('aria-expanded', 'false');
        };

        const toggleDropdown = (e) => {
            e.stopPropagation();
            const isOpen = dropdownContent.classList.toggle('show');
            dropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };

        dropdownBtn.addEventListener('click', toggleDropdown);

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                closeDropdown();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dropdownContent.classList.contains('show')) {
                closeDropdown();
                dropdownBtn.focus();
            }
        });

        if (exportMdBtn) {
            exportMdBtn.addEventListener('click', () => {
                closeDropdown();
                const content = editor.getValue();
                const filename = deriveFilename(content, 'md');
                downloadFile(content, filename, 'text/markdown');
            });
        }

        if (exportHtmlBtn) {
            exportHtmlBtn.addEventListener('click', () => {
                closeDropdown();
                const content = editor.getValue();
                const outputElement = document.querySelector('#output');
                const renderedHtml = outputElement ? outputElement.innerHTML : '';
                const match = content.match(/^#\s+(.+)$/m);
                const docTitle = match && match[1] ? match[1].trim() : 'Markdown Live Preview Export';
                const fullHtml = generateHtmlDocument(docTitle, renderedHtml);
                const filename = deriveFilename(content, 'html');
                downloadFile(fullHtml, filename, 'text/html');
            });
        }

        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                closeDropdown();
                exportPreviewToPdf();
            });
        }
    };

    let setupDragAndDrop = () => {
        const container = document.getElementById('container');
        if (!container) return;

        ['dragenter', 'dragover'].forEach((eventName) => {
            window.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            window.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (eventName === 'drop' || (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
                    container.classList.remove('drag-over');
                }
            });
        });

        window.addEventListener('drop', async (e) => {
            container.classList.remove('drag-over');
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0) return;

            const file = files[0];
            if (!isMarkdownFile(file)) {
                window.alert('Please drop a Markdown (.md) or plain text file.');
                return;
            }

            try {
                const content = await readFileAsText(file);
                presetValue(content);
                autosaveManager.saveImmediately(content);
                document.querySelector('#preview')?.scrollTo({ top: 0 });
            } catch (err) {
                window.alert('Unable to read this file. Please try again.');
            }
        });
    };

    // ----- local state -----

    let loadScrollBarSettings = () => {
        try {
            return Storehouse.getItem(localStorageNamespace, localStorageScrollBarKey);
        } catch {
            return false;
        }
    };

    let loadThemeSettings = () => {
        try {
            let last = Storehouse.getItem(localStorageNamespace, localStorageThemeKey);
            if (last === null || last === undefined) {
                const raw = localStorage.getItem('com.markdownlivepreview_theme');
                if (raw === 'dark') return true;
                if (raw === 'light') return false;
            }
            return last;
        } catch {
            return false;
        }
    };

    let saveScrollBarSettings = (settings) => {
        try {
            let expiredAt = new Date(2099, 1, 1);
            Storehouse.setItem(localStorageNamespace, localStorageScrollBarKey, settings, expiredAt);
        } catch {
            // ignore storage errors
        }
    };

    let saveThemeSettings = (settings) => {
        try {
            let expiredAt = new Date(2099, 1, 1);
            Storehouse.setItem(localStorageNamespace, localStorageThemeKey, settings, expiredAt);
            localStorage.setItem('com.markdownlivepreview_theme', settings ? 'dark' : 'light');
        } catch {
            // ignore storage errors
        }
    };

    let setupDivider = () => {
        let lastLeftRatio = 0.5;
        const divider = document.getElementById('split-divider');
        const leftPane = document.getElementById('edit');
        const rightPane = document.getElementById('preview');
        const container = document.getElementById('container');

        let isDragging = false;

        divider.addEventListener('mouseenter', () => {
            divider.classList.add('hover');
        });

        divider.addEventListener('mouseleave', () => {
            if (!isDragging) {
                divider.classList.remove('hover');
            }
        });

        divider.addEventListener('mousedown', () => {
            isDragging = true;
            divider.classList.add('active');
            document.body.style.cursor = 'col-resize';
        });

        divider.addEventListener('dblclick', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const halfWidth = (totalWidth - dividerWidth) / 2;

            leftPane.style.width = halfWidth + 'px';
            rightPane.style.width = halfWidth + 'px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            document.body.style.userSelect = 'none';
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const offsetX = e.clientX - containerRect.left;
            const dividerWidth = divider.offsetWidth;

            // Prevent overlap or out-of-bounds
            const minWidth = 100;
            const maxWidth = totalWidth - minWidth - dividerWidth;
            const leftWidth = Math.max(minWidth, Math.min(offsetX, maxWidth));
            leftPane.style.width = leftWidth + 'px';
            rightPane.style.width = (totalWidth - leftWidth - dividerWidth) + 'px';
            lastLeftRatio = leftWidth / (totalWidth - dividerWidth);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                divider.classList.remove('active');
                divider.classList.remove('hover');
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
            }
        });

        window.addEventListener('resize', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const availableWidth = totalWidth - dividerWidth;

            const newLeft = availableWidth * lastLeftRatio;
            const newRight = availableWidth * (1 - lastLeftRatio);

            leftPane.style.width = newLeft + 'px';
            rightPane.style.width = newRight + 'px';
        });
    };

    let setupAuthAndCloudNotes = (editor) => {
        const signInBtn = document.querySelector('#sign-in-btn');
        const userDropdown = document.querySelector('#user-dropdown');
        const userMenuBtn = document.querySelector('#user-menu-btn');
        const userDropdownContent = document.querySelector('#user-dropdown-content');
        const userDisplayName = document.querySelector('#user-display-name');
        const signOutBtn = document.querySelector('#sign-out-btn');

        const authDialog = document.querySelector('#auth-dialog');
        const authDialogTitle = document.querySelector('#auth-dialog-title');
        const closeAuthDialogBtn = document.querySelector('#close-auth-dialog-btn');
        const authWarning = document.querySelector('#auth-unconfigured-warning');
        const authStatusMsg = document.querySelector('#auth-status-msg');

        // Tabs
        const tabSignIn = document.querySelector('#tab-signin');
        const tabSignUp = document.querySelector('#tab-signup');
        const tabMagic = document.querySelector('#tab-magic');

        // Forms
        const signinForm = document.querySelector('#signin-form');
        const signinEmailInput = document.querySelector('#signin-email');
        const signinPasswordInput = document.querySelector('#signin-password');
        const signinSubmitBtn = document.querySelector('#signin-submit-btn');

        const signupForm = document.querySelector('#signup-form');
        const signupEmailInput = document.querySelector('#signup-email');
        const signupPasswordInput = document.querySelector('#signup-password');
        const signupSubmitBtn = document.querySelector('#signup-submit-btn');

        const magicLinkForm = document.querySelector('#magic-link-form');
        const magicEmailInput = document.querySelector('#magic-email');
        const magicSubmitBtn = document.querySelector('#magic-submit-btn');

        // Tab Switch Buttons
        const switchToSignUp = document.querySelector('#switch-to-signup');
        const switchToSignIn = document.querySelector('#switch-to-signin');

        // OAuth Handlers
        const authGoogleBtn = document.querySelector('#auth-google-btn');
        const authGithubBtn = document.querySelector('#auth-github-btn');

        const notesDialog = document.querySelector('#notes-dialog');
        const closeNotesDialogBtn = document.querySelector('#close-notes-dialog-btn');
        const myNotesBtn = document.querySelector('#my-notes-btn');
        const newCloudNoteBtn = document.querySelector('#new-cloud-note-btn');
        const dialogNewNoteBtn = document.querySelector('#dialog-new-note-btn');
        const notesList = document.querySelector('#notes-list');
        const notesLoading = document.querySelector('#notes-loading');
        const notesEmpty = document.querySelector('#notes-empty');

        const isConfigured = isSupabaseConfigured();

        const showStatus = (message, type = 'info') => {
            if (!authStatusMsg) return;
            authStatusMsg.textContent = message;
            authStatusMsg.className = `dialog-status-msg status-${type}`;
            authStatusMsg.classList.remove('hidden');
        };

        const clearStatus = () => {
            if (!authStatusMsg) return;
            authStatusMsg.textContent = '';
            authStatusMsg.className = 'dialog-status-msg hidden';
        };

        const switchTab = (tab) => {
            clearStatus();
            const tabConfigs = [
                { id: 'signin', btn: tabSignIn, form: signinForm, title: 'Sign In' },
                { id: 'signup', btn: tabSignUp, form: signupForm, title: 'Create Account' },
                { id: 'magic', btn: tabMagic, form: magicLinkForm, title: 'Magic Link' }
            ];

            tabConfigs.forEach(({ id, btn, form, title }) => {
                const isActive = id === tab;
                if (btn) {
                    btn.classList.toggle('active', isActive);
                    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                }
                if (form) {
                    form.classList.toggle('hidden', !isActive);
                }
                if (isActive && authDialogTitle) {
                    authDialogTitle.textContent = title;
                }
            });
        };

        if (tabSignIn) tabSignIn.addEventListener('click', () => switchTab('signin'));
        if (tabSignUp) tabSignUp.addEventListener('click', () => switchTab('signup'));
        if (tabMagic) tabMagic.addEventListener('click', () => switchTab('magic'));
        if (switchToSignUp) switchToSignUp.addEventListener('click', () => switchTab('signup'));
        if (switchToSignIn) switchToSignIn.addEventListener('click', () => switchTab('signin'));

        // Auth Dialog open/close
        if (signInBtn && authDialog) {
            signInBtn.addEventListener('click', () => {
                if (authWarning) {
                    if (isConfigured) {
                        authWarning.classList.add('hidden');
                    } else {
                        authWarning.classList.remove('hidden');
                    }
                }
                clearStatus();
                switchTab('signin');
                authDialog.showModal();
            });
        }

        if (closeAuthDialogBtn && authDialog) {
            closeAuthDialogBtn.addEventListener('click', () => {
                authDialog.close();
            });
        }

        // Email + Password Sign In Form
        if (signinForm) {
            signinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = signinEmailInput?.value.trim() || '';
                const password = signinPasswordInput?.value || '';
                if (!email || !password) return;

                if (signinSubmitBtn) {
                    signinSubmitBtn.disabled = true;
                    signinSubmitBtn.textContent = 'Signing in...';
                }
                showStatus('Signing in...', 'info');

                const { error } = await signInWithPassword(email, password);

                if (signinSubmitBtn) {
                    signinSubmitBtn.disabled = false;
                    signinSubmitBtn.textContent = 'Sign In';
                }

                if (error) {
                    showStatus(error.message, 'error');
                } else {
                    showStatus('Signed in successfully!', 'success');
                }
            });
        }

        // Email + Password Sign Up Form
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = signupEmailInput?.value.trim() || '';
                const password = signupPasswordInput?.value || '';
                if (!email || !password) return;

                if (signupSubmitBtn) {
                    signupSubmitBtn.disabled = true;
                    signupSubmitBtn.textContent = 'Creating account...';
                }
                showStatus('Creating account...', 'info');

                const { error, requiresEmailConfirmation } = await signUpWithPassword(email, password);

                if (signupSubmitBtn) {
                    signupSubmitBtn.disabled = false;
                    signupSubmitBtn.textContent = 'Create Free Account';
                }

                if (error) {
                    showStatus(error.message, 'error');
                } else if (requiresEmailConfirmation) {
                    showStatus('Registration successful! Please check your email to confirm your account, then sign in.', 'success');
                } else {
                    showStatus('Account created and signed in!', 'success');
                }
            });
        }

        // Magic link form
        if (magicLinkForm) {
            magicLinkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = magicEmailInput?.value.trim() || '';
                if (!email) return;

                if (magicSubmitBtn) {
                    magicSubmitBtn.disabled = true;
                    magicSubmitBtn.textContent = 'Sending...';
                }
                showStatus('Sending magic link to your email...', 'info');

                const { error } = await signInWithOtp(email);

                if (magicSubmitBtn) {
                    magicSubmitBtn.disabled = false;
                    magicSubmitBtn.textContent = 'Send Magic Link';
                }

                if (error) {
                    showStatus(error.message, 'error');
                } else {
                    showStatus('Magic login link sent! Please check your email inbox.', 'success');
                }
            });
        }

        // OAuth Handlers
        if (authGoogleBtn) {
            authGoogleBtn.addEventListener('click', async () => {
                showStatus('Redirecting to Google...', 'info');
                const { error } = await signInWithOAuth('google');
                if (error) {
                    showStatus(error.message, 'error');
                }
            });
        }

        if (authGithubBtn) {
            authGithubBtn.addEventListener('click', async () => {
                showStatus('Redirecting to GitHub...', 'info');
                const { error } = await signInWithOAuth('github');
                if (error) {
                    showStatus(error.message, 'error');
                }
            });
        }

        // Detect OAuth redirects with error in hash
        const checkUrlHashForAuthErrors = () => {
            if (typeof window === 'undefined' || !window.location.hash) return;
            try {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const error = params.get('error');
                const errorDesc = params.get('error_description');
                if (error || errorDesc) {
                    const cleanMsg = errorDesc || error;
                    // Clean URL hash so error parameters do not linger
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                    if (authDialog) {
                        authDialog.showModal();
                        showStatus(`OAuth sign-in: ${cleanMsg}. (Tip: OAuth providers must be enabled in your Supabase Dashboard, or sign in directly with Email & Password.)`, 'error');
                    }
                }
            } catch (err) {
                console.warn('Failed to parse URL hash error:', err);
            }
        };

        checkUrlHashForAuthErrors();

        // User Dropdown toggle
        if (userMenuBtn && userDropdownContent) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = userDropdownContent.classList.toggle('show');
                userMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            document.addEventListener('click', (e) => {
                if (userDropdown && !userDropdown.contains(e.target)) {
                    userDropdownContent.classList.remove('show');
                    userMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Sign Out
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                if (userDropdownContent) userDropdownContent.classList.remove('show');
                await supabaseSignOut();
                currentCloudDocId = null;
                if (saveStatusElement) saveStatusElement.textContent = 'Saved';
            });
        }

        // Notes Dialog open/close
        const closeNotesModal = () => {
            if (notesDialog) notesDialog.close();
        };

        if (closeNotesDialogBtn) {
            closeNotesDialogBtn.addEventListener('click', closeNotesModal);
        }

        const renderNotesList = async () => {
            if (!notesList || !notesLoading || !notesEmpty) return;
            notesList.innerHTML = '';
            notesLoading.classList.remove('hidden');
            notesEmpty.classList.add('hidden');

            const docs = await listCloudDocuments();
            notesLoading.classList.add('hidden');

            if (docs.length === 0) {
                notesEmpty.classList.remove('hidden');
                return;
            }

            docs.forEach((doc) => {
                const li = document.createElement('li');
                li.className = 'note-item';

                const info = document.createElement('div');
                info.className = 'note-info';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'note-title';
                titleSpan.textContent = doc.title || 'Untitled Document';

                const dateSpan = document.createElement('span');
                dateSpan.className = 'note-date';
                const updatedDate = new Date(doc.updated_at);
                dateSpan.textContent = isNaN(updatedDate.getTime()) ? '' : `Updated ${updatedDate.toLocaleDateString()} ${updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                info.appendChild(titleSpan);
                info.appendChild(dateSpan);

                const actions = document.createElement('div');
                actions.className = 'note-actions';

                const openBtn = document.createElement('button');
                openBtn.type = 'button';
                openBtn.className = 'note-btn open-btn';
                openBtn.textContent = 'Open';
                openBtn.addEventListener('click', () => {
                    currentCloudDocId = doc.id;
                    presetValue(doc.content);
                    autosaveManager.saveImmediately(doc.content);
                    closeNotesModal();
                    if (saveStatusElement) saveStatusElement.textContent = 'Saved (Cloud)';
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'note-btn delete-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async () => {
                    const confirmed = window.confirm(`Are you sure you want to delete "${doc.title || 'Untitled'}"?`);
                    if (!confirmed) return;
                    deleteBtn.disabled = true;
                    const success = await deleteCloudDocument(doc.id);
                    if (success) {
                        if (currentCloudDocId === doc.id) {
                            currentCloudDocId = null;
                            if (saveStatusElement) saveStatusElement.textContent = 'Saved';
                        }
                        renderNotesList();
                    } else {
                        deleteBtn.disabled = false;
                        window.alert('Failed to delete document.');
                    }
                });

                actions.appendChild(openBtn);
                actions.appendChild(deleteBtn);

                li.appendChild(info);
                li.appendChild(actions);
                notesList.appendChild(li);
            });
        };

        if (myNotesBtn) {
            myNotesBtn.addEventListener('click', () => {
                if (userDropdownContent) userDropdownContent.classList.remove('show');
                if (notesDialog) {
                    notesDialog.showModal();
                    renderNotesList();
                }
            });
        }

        const handleNewCloudNote = async () => {
            const newDoc = await createCloudDocument('Untitled Document', defaultInput);
            if (newDoc) {
                currentCloudDocId = newDoc.id;
                presetValue(defaultInput);
                autosaveManager.saveImmediately(defaultInput);
                closeNotesModal();
                if (saveStatusElement) saveStatusElement.textContent = 'Saved (Cloud)';
            } else {
                window.alert('Failed to create new cloud note.');
            }
        };

        if (newCloudNoteBtn) {
            newCloudNoteBtn.addEventListener('click', () => {
                if (userDropdownContent) userDropdownContent.classList.remove('show');
                handleNewCloudNote();
            });
        }

        if (dialogNewNoteBtn) {
            dialogNewNoteBtn.addEventListener('click', handleNewCloudNote);
        }

        // Listen for authentication changes
        onAuthStateChange((user) => {
            currentUser = user;
            if (user) {
                if (signInBtn) signInBtn.classList.add('hidden');
                if (userDropdown) userDropdown.classList.remove('hidden');
                if (userDisplayName) {
                    const email = user.email || '';
                    const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'Account';
                    userDisplayName.textContent = name;
                }
                if (authDialog && authDialog.open) {
                    authDialog.close();
                }
                if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token=')) {
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            } else {
                if (signInBtn) signInBtn.classList.remove('hidden');
                if (userDropdown) userDropdown.classList.add('hidden');
                currentCloudDocId = null;
                if (saveStatusElement) saveStatusElement.textContent = 'Saved';
            }
        });
    };

    // ----- entry point -----
    let lastContent = autosaveManager.load(defaultInput);
    let editor = setupEditor();
    presetValue(lastContent);
    setupOpenButton();
    setupResetButton();
    setupCopyButton(editor);
    setupExportMenu(editor);
    setupDragAndDrop();
    setupAuthAndCloudNotes(editor);

    let scrollBarSettings = loadScrollBarSettings() || false;
    initScrollBarSync(scrollBarSettings);

    // initialize theme (dark/light)
    let themeSettings = loadThemeSettings();
    // normalize to boolean (Storehouse may return string or boolean)
    if (themeSettings === 'true' || themeSettings === true) {
        themeSettings = true;
    } else {
        themeSettings = false;
    }
    initThemeToggle(themeSettings);

    setupDivider();
};

window.addEventListener("load", () => {
    init();
});
