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
    let currentDocTitle = 'Untitled Document';

    const deriveTitle = (markdown) => {
        const match = markdown.match(/^#\s+(.+)$/m);
        return match && match[1] ? match[1].trim() : 'Untitled Document';
    };

    const saveStatusElement = document.querySelector('#save-status');
    const saveStatusText = document.querySelector('#save-status-text');
    const activeDocBadge = document.querySelector('#active-doc-badge');
    const docTabTitle = document.querySelector('#doc-tab-title');

    const updateDocTab = (title) => {
        if (!docTabTitle) return;
        const clean = (title || 'Untitled').replace(/\.md$/i, '') + '.md';
        docTabTitle.textContent = clean;
        currentDocTitle = title || 'Untitled Document';
    };

    const updateActiveDocBadge = (title) => {
        updateDocTab(title);
        if (!activeDocBadge) return;
        if (currentCloudDocId && title) {
            activeDocBadge.textContent = `☁ ${title}`;
            activeDocBadge.title = `Active cloud document: ${title}`;
            activeDocBadge.classList.remove('hidden');
        } else {
            activeDocBadge.textContent = '';
            activeDocBadge.classList.add('hidden');
        }
    };

    const setStatusMessage = (text, type = 'saved') => {
        if (!saveStatusElement) return;
        saveStatusElement.classList.remove('saving', 'offline', 'error');
        if (type === 'saving') saveStatusElement.classList.add('saving');
        else if (type === 'offline') saveStatusElement.classList.add('offline');
        else if (type === 'error') saveStatusElement.classList.add('error');

        if (saveStatusText) {
            saveStatusText.textContent = text;
        } else {
            saveStatusElement.textContent = text;
        }
    };

    const updateSaveStatus = (status) => {
        switch (status) {
            case 'saving':
                setStatusMessage('Saving...', 'saving');
                break;
            case 'saved':
                setStatusMessage(currentCloudDocId ? 'Saved (Cloud)' : 'Saved just now', 'saved');
                break;
            case 'unavailable':
                setStatusMessage('Offline (unsaved)', 'offline');
                break;
            case 'error':
                setStatusMessage('Save failed', 'error');
                break;
        }
    };

    const syncToCloud = debounce(async (content) => {
        if (!currentUser || !currentCloudDocId) return;
        setStatusMessage('Syncing to Cloud...', 'saving');
        const title = deriveTitle(content);
        const updated = await updateCloudDocument(currentCloudDocId, {
            content,
            title
        });
        if (updated) {
            updateActiveDocBadge(updated.title || title);
            setStatusMessage('Saved (Cloud)', 'saved');
        } else {
            setStatusMessage('Offline (Saved locally)', 'offline');
        }
    }, 500);

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
        currentCloudDocId = null;
        currentDocTitle = 'Untitled Document';
        try {
            localStorage.removeItem('com.markdownlivepreview_doc_title');
        } catch {}
        updateActiveDocBadge('');
        updateDocTab('Untitled Document');
        presetValue(defaultInput);
        autosaveManager.saveImmediately(defaultInput);
        document.querySelectorAll('.column').forEach((element) => {
            element.scrollTo({ top: 0 });
        });
    };

    let presetValue = (value) => {
        const safeValue = typeof value === 'string' ? value : (value ?? '');
        editor.setValue(safeValue);
        editor.revealPosition({ lineNumber: 1, column: 1 });
        editor.focus();
        convert(safeValue);
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
        const sun = document.querySelector('.theme-icon-sun');
        const moon = document.querySelector('.theme-icon-moon');
        if (sun && moon) {
            sun.classList.toggle('hidden', enabled);
            moon.classList.toggle('hidden', !enabled);
        }
    };

    let initThemeToggle = (settings) => {
        let checkbox = document.querySelector('#theme-checkbox');
        let themeBtn = document.querySelector('#theme-toggle-btn');
        if (checkbox) checkbox.checked = settings;
        setTheme(settings);

        // set Monaco editor theme to match page theme
        if (monaco && monaco.editor && typeof monaco.editor.setTheme === 'function') {
            monaco.editor.setTheme(settings ? 'vs-dark' : 'vs');
        }
        // set preview css to match theme
        setPreviewCss(settings);

        const applyThemeChange = (checked) => {
            setTheme(checked);
            saveThemeSettings(checked);
            setPreviewCss(checked);
            if (checkbox) checkbox.checked = checked;
            if (monaco && monaco.editor && typeof monaco.editor.setTheme === 'function') {
                monaco.editor.setTheme(checked ? 'vs-dark' : 'vs');
            }
            renderMermaidDiagrams();
        };

        if (checkbox) {
            checkbox.addEventListener('change', (event) => {
                applyThemeChange(event.currentTarget.checked);
            });
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') === 'dark';
                applyThemeChange(!current);
            });
        }
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
            const baseName = file.name ? file.name.replace(/\.md$/i, '') : deriveTitle(content);
            currentDocTitle = baseName;
            try {
                localStorage.setItem('com.markdownlivepreview_doc_title', baseName);
            } catch {}
            updateDocTab(baseName);
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
                const baseName = file.name ? file.name.replace(/\.md$/i, '') : deriveTitle(content);
                currentDocTitle = baseName;
                try {
                    localStorage.setItem('com.markdownlivepreview_doc_title', baseName);
                } catch {}
                updateDocTab(baseName);
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

                if (currentCloudDocId === doc.id) {
                    const activeBadge = document.createElement('span');
                    activeBadge.className = 'current-note-badge';
                    activeBadge.textContent = 'Active';
                    titleSpan.appendChild(activeBadge);
                }

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
                openBtn.addEventListener('click', async () => {
                    try {
                        openBtn.disabled = true;
                        openBtn.textContent = 'Opening...';

                        let noteContent = doc.content;
                        if (typeof noteContent !== 'string') {
                            const fullDoc = await getCloudDocument(doc.id);
                            noteContent = fullDoc?.content ?? '';
                        }

                        currentCloudDocId = doc.id;
                        currentDocTitle = doc.title || 'Untitled Document';
                        try {
                            localStorage.setItem('com.markdownlivepreview_doc_title', currentDocTitle);
                        } catch {}
                        presetValue(noteContent);
                        autosaveManager.saveImmediately(noteContent);
                        updateActiveDocBadge(doc.title || 'Untitled Document');
                        closeNotesModal();
                        if (saveStatusElement) saveStatusElement.textContent = 'Saved (Cloud)';
                    } catch (err) {
                        console.error('Failed to open document:', err);
                        window.alert('Failed to open note. Please try again.');
                    } finally {
                        openBtn.disabled = false;
                        openBtn.textContent = 'Open';
                    }
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
                            updateActiveDocBadge('');
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
            const initialContent = '# Untitled Note\n\nStart writing your note here...\n';
            const newDoc = await createCloudDocument('Untitled Note', initialContent);
            if (newDoc) {
                currentCloudDocId = newDoc.id;
                currentDocTitle = newDoc.title || 'Untitled Note';
                try {
                    localStorage.setItem('com.markdownlivepreview_doc_title', currentDocTitle);
                } catch {}
                presetValue(initialContent);
                autosaveManager.saveImmediately(initialContent);
                updateActiveDocBadge(newDoc.title);
                updateDocTab(newDoc.title);
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

        const myNotesHeaderBtn = document.querySelector('#my-notes-header-btn');
        if (myNotesHeaderBtn) {
            myNotesHeaderBtn.addEventListener('click', () => {
                if (notesDialog) {
                    notesDialog.showModal();
                    renderNotesList();
                }
            });
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
                    const avatarInitial = document.querySelector('#user-avatar-initial');
                    if (avatarInitial) {
                        avatarInitial.textContent = name.charAt(0).toUpperCase();
                    }
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
                updateActiveDocBadge('');
                setStatusMessage('Saved just now');
            }
        });
    };

    const setupSaveNoteDialog = (editor) => {
        const saveDialog = document.querySelector('#save-note-dialog');
        const closeBtn = document.querySelector('#close-save-dialog-btn');
        const cancelBtn = document.querySelector('#cancel-save-dialog-btn');
        const saveForm = document.querySelector('#save-note-form');
        const titleInput = document.querySelector('#save-input-title');
        const descInput = document.querySelector('#save-input-desc');
        const tagsInput = document.querySelector('#save-input-tags');
        const visButtons = document.querySelectorAll('.visibility-segmented .vis-btn');
        const statusMsg = document.querySelector('#save-dialog-status');
        const downloadDirectBtn = document.querySelector('#download-md-direct-btn');
        const confirmSaveBtn = document.querySelector('#confirm-save-btn');
        const headerSaveBtn = document.querySelector('#header-save-cloud-btn');
        const saveCurrentNoteBtn = document.querySelector('#save-current-note-btn');
        const userDropdownContent = document.querySelector('#user-dropdown-content');

        let selectedVisibility = 'private';

        visButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                visButtons.forEach((b) => {
                    const isSelected = b === btn;
                    b.classList.toggle('active', isSelected);
                    b.setAttribute('aria-checked', isSelected ? 'true' : 'false');
                });
                selectedVisibility = btn.getAttribute('data-vis') || 'private';
            });
        });

        const openSaveDialog = () => {
            if (!saveDialog) return;
            const content = editor.getValue();
            const derived = deriveTitle(content);
            let initialTitle = currentDocTitle;
            if (!initialTitle || initialTitle === 'Untitled Document') {
                initialTitle = (derived && derived !== 'Untitled Document') ? derived : 'Untitled Document';
            }

            if (titleInput) {
                titleInput.value = initialTitle.replace(/\.md$/i, '');
            }

            if (statusMsg) {
                statusMsg.textContent = '';
                statusMsg.className = 'dialog-status-msg hidden';
            }

            if (confirmSaveBtn) {
                confirmSaveBtn.disabled = false;
                confirmSaveBtn.textContent = 'Save';
            }

            saveDialog.showModal();

            if (titleInput) {
                setTimeout(() => {
                    titleInput.focus();
                    titleInput.select();
                }, 50);
            }
        };

        const closeSaveDialog = () => {
            if (saveDialog && saveDialog.open) {
                saveDialog.close();
                if (editor && typeof editor.focus === 'function') {
                    editor.focus();
                }
            }
        };

        if (closeBtn) closeBtn.addEventListener('click', closeSaveDialog);
        if (cancelBtn) cancelBtn.addEventListener('click', closeSaveDialog);

        if (saveDialog) {
            saveDialog.addEventListener('click', (e) => {
                if (e.target === saveDialog) {
                    closeSaveDialog();
                }
            });
        }

        if (downloadDirectBtn) {
            downloadDirectBtn.addEventListener('click', () => {
                const enteredTitle = titleInput?.value.trim() || currentDocTitle || 'Untitled Document';
                const filename = enteredTitle.replace(/\.md$/i, '') + '.md';
                const content = editor.getValue();
                downloadFile(content, filename, 'text/markdown');
                updateDocTab(enteredTitle);
                closeSaveDialog();
                setStatusMessage('Downloaded .md', 'saved');
            });
        }

        if (saveForm) {
            saveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = titleInput?.value.trim();
                if (!title) {
                    if (statusMsg) {
                        statusMsg.textContent = 'Please enter a title.';
                        statusMsg.className = 'dialog-status-msg status-error';
                        statusMsg.classList.remove('hidden');
                    }
                    titleInput?.focus();
                    return;
                }

                if (confirmSaveBtn) {
                    confirmSaveBtn.disabled = true;
                    confirmSaveBtn.textContent = 'Saving...';
                }

                const content = editor.getValue();
                currentDocTitle = title;
                updateDocTab(title);

                try {
                    localStorage.setItem('com.markdownlivepreview_doc_title', title);
                    const meta = {
                        title,
                        description: descInput?.value.trim() || '',
                        tags: tagsInput?.value.trim() || '',
                        visibility: selectedVisibility
                    };
                    localStorage.setItem(`com.markdownlivepreview_meta_${title}`, JSON.stringify(meta));
                } catch {}

                autosaveManager.saveImmediately(content);

                if (currentUser) {
                    try {
                        if (currentCloudDocId) {
                            const updated = await updateCloudDocument(currentCloudDocId, { content, title });
                            if (updated) {
                                updateActiveDocBadge(updated.title || title);
                                setStatusMessage('Saved (Cloud)', 'saved');
                            } else {
                                setStatusMessage('Offline (Saved locally)', 'offline');
                            }
                        } else {
                            const newDoc = await createCloudDocument(title, content);
                            if (newDoc) {
                                currentCloudDocId = newDoc.id;
                                updateActiveDocBadge(newDoc.title || title);
                                setStatusMessage('Saved (Cloud)', 'saved');
                            } else {
                                setStatusMessage('Offline (Saved locally)', 'offline');
                            }
                        }
                    } catch (err) {
                        console.error('Failed to save to cloud:', err);
                        setStatusMessage('Saved locally (Cloud sync failed)', 'offline');
                    }
                } else {
                    updateActiveDocBadge(title);
                    setStatusMessage('Saved just now', 'saved');
                }

                if (confirmSaveBtn) {
                    confirmSaveBtn.disabled = false;
                    confirmSaveBtn.textContent = 'Save';
                }

                closeSaveDialog();
            });
        }

        if (headerSaveBtn) {
            headerSaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openSaveDialog();
            });
        }

        if (saveCurrentNoteBtn) {
            saveCurrentNoteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (userDropdownContent) userDropdownContent.classList.remove('show');
                openSaveDialog();
            });
        }

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                openSaveDialog();
            }
        });

        if (editor && typeof editor.addCommand === 'function') {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                openSaveDialog();
            });
        }

        return {
            openSaveDialog,
            closeSaveDialog
        };
    };

    const setupViewModeSwitcher = (editor) => {
        const splitBtn = document.querySelector('#view-split-btn');
        const editorBtn = document.querySelector('#view-editor-btn');
        const previewBtn = document.querySelector('#view-preview-btn');

        const editPane = document.querySelector('#edit');
        const divider = document.querySelector('#split-divider');
        const previewPane = document.querySelector('#preview');

        if (!splitBtn || !editorBtn || !previewBtn || !editPane || !divider || !previewPane) return;

        const setViewMode = (mode) => {
            const btns = [
                { id: 'split', btn: splitBtn },
                { id: 'editor', btn: editorBtn },
                { id: 'preview', btn: previewBtn }
            ];

            btns.forEach(({ id, btn }) => {
                const isActive = id === mode;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
            });

            if (mode === 'split') {
                editPane.style.display = '';
                editPane.style.width = '50%';
                divider.style.display = '';
                previewPane.style.display = '';
                previewPane.style.width = '50%';
            } else if (mode === 'editor') {
                editPane.style.display = '';
                editPane.style.width = '100%';
                divider.style.display = 'none';
                previewPane.style.display = 'none';
            } else if (mode === 'preview') {
                editPane.style.display = 'none';
                divider.style.display = 'none';
                previewPane.style.display = '';
                previewPane.style.width = '100%';
            }

            if (editor && typeof editor.layout === 'function') {
                setTimeout(() => editor.layout(), 20);
            }
        };

        splitBtn.addEventListener('click', () => setViewMode('split'));
        editorBtn.addEventListener('click', () => setViewMode('editor'));
        previewBtn.addEventListener('click', () => setViewMode('preview'));
    };

    const setupFormattingToolbar = (editor) => {
        const fmtBold = document.querySelector('#fmt-bold');
        const fmtItalic = document.querySelector('#fmt-italic');
        const fmtLink = document.querySelector('#fmt-link');
        const fmtQuote = document.querySelector('#fmt-quote');
        const fmtCode = document.querySelector('#fmt-code');

        const applyFormat = (type) => {
            if (!editor) return;
            const selection = editor.getSelection();
            const model = editor.getModel();
            if (!selection || !model) return;

            const selected = model.getValueInRange(selection);
            let replacement = '';

            switch (type) {
                case 'bold':
                    replacement = `**${selected || 'bold text'}**`;
                    break;
                case 'italic':
                    replacement = `*${selected || 'italic text'}*`;
                    break;
                case 'link':
                    replacement = `[${selected || 'link text'}](https://example.com)`;
                    break;
                case 'quote':
                    replacement = selected
                        ? selected.split('\n').map((l) => `> ${l}`).join('\n')
                        : '> quote text';
                    break;
                case 'code':
                    if (selected.includes('\n')) {
                        replacement = `\`\`\`\n${selected}\n\`\`\``;
                    } else {
                        replacement = `\`${selected || 'code'}\``;
                    }
                    break;
            }

            editor.executeEdits('formatting-toolbar', [{
                range: selection,
                text: replacement,
                forceMoveMarkers: true
            }]);
            editor.focus();
        };

        if (fmtBold) fmtBold.addEventListener('click', () => applyFormat('bold'));
        if (fmtItalic) fmtItalic.addEventListener('click', () => applyFormat('italic'));
        if (fmtLink) fmtLink.addEventListener('click', () => applyFormat('link'));
        if (fmtQuote) fmtQuote.addEventListener('click', () => applyFormat('quote'));
        if (fmtCode) fmtCode.addEventListener('click', () => applyFormat('code'));
    };

    const setupFooterStats = (editor) => {
        const cursorEl = document.querySelector('#footer-cursor-pos');
        const wordsEl = document.querySelector('#footer-word-count');
        const readTimeEl = document.querySelector('#footer-read-time');

        if (cursorEl && editor) {
            editor.onDidChangeCursorPosition((e) => {
                cursorEl.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
            });
        }

        const updateStats = (val) => {
            if (!wordsEl && !readTimeEl) return;
            const text = (val || '').trim();
            const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
            const minutes = Math.max(1, Math.ceil(words / 200));

            if (wordsEl) wordsEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
            if (readTimeEl) readTimeEl.textContent = `${minutes} min read`;
        };

        if (editor) {
            editor.onDidChangeModelContent(() => {
                updateStats(editor.getValue());
            });
            updateStats(editor.getValue());
        }
    };

    const setupFullscreenToggle = () => {
        const btn = document.querySelector('#fullscreen-toggle-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    };

    const setupToolbarActions = (editor) => {
        const copyBtn = document.querySelector('#toolbar-copy-btn');
        const resetBtn = document.querySelector('#toolbar-reset-btn');

        if (copyBtn && editor) {
            copyBtn.addEventListener('click', () => {
                const text = editor.getValue();
                navigator.clipboard.writeText(text).then(() => {
                    const originalTitle = copyBtn.getAttribute('title') || 'Copy Markdown';
                    copyBtn.setAttribute('title', 'Copied!');
                    setTimeout(() => {
                        copyBtn.setAttribute('title', originalTitle);
                    }, 1500);
                }).catch(() => {});
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', reset);
        }
    };

    const setupDocumentTabs = () => {
        const closeTabBtn = document.querySelector('#close-doc-tab-btn');
        const newTabBtn = document.querySelector('#new-tab-btn');

        if (closeTabBtn) {
            closeTabBtn.addEventListener('click', reset);
        }

        if (newTabBtn) {
            newTabBtn.addEventListener('click', () => {
                const newNoteBtn = document.querySelector('#new-cloud-note-btn');
                if (newNoteBtn) {
                    newNoteBtn.click();
                } else {
                    reset();
                }
            });
        }
    };

    // ----- entry point -----
    let lastContent = autosaveManager.load(defaultInput);
    let editor = setupEditor();
    presetValue(lastContent);

    let initialDocTitle = 'Untitled Document';
    try {
        initialDocTitle = localStorage.getItem('com.markdownlivepreview_doc_title') || '';
    } catch {}
    if (!initialDocTitle && lastContent) {
        initialDocTitle = deriveTitle(lastContent);
    }
    updateDocTab(initialDocTitle || 'Untitled Document');

    setupOpenButton();
    setupResetButton();
    setupCopyButton(editor);
    setupExportMenu(editor);
    setupDragAndDrop();
    setupAuthAndCloudNotes(editor);
    setupSaveNoteDialog(editor);
    setupViewModeSwitcher(editor);
    setupFormattingToolbar(editor);
    setupFooterStats(editor);
    setupFullscreenToggle();
    setupToolbarActions(editor);
    setupDocumentTabs();

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
