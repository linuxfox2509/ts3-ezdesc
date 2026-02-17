console.log('Script loaded');

// BBCode Parser and Renderer
class BBCodeParser {
    constructor() {
        this.escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
    }

    escapeHtml(text) {
        return text.replace(/[&<>"']/g, m => this.escapeMap[m]);
    }

    parse(bbcode) {
        return this.parseTokens(this.tokenize(bbcode));
    }

    tokenize(text) {
        const tokens = [];
        let i = 0;

        while (i < text.length) {
            const bracketIdx = text.indexOf('[', i);

            if (bracketIdx === -1) {
                if (i < text.length) {
                    tokens.push({ type: 'text', value: text.substring(i) });
                }
                break;
            }

            if (bracketIdx > i) {
                tokens.push({ type: 'text', value: text.substring(i, bracketIdx) });
            }

            const closeBracketIdx = text.indexOf(']', bracketIdx);
            if (closeBracketIdx === -1) {
                tokens.push({ type: 'text', value: text.substring(bracketIdx) });
                break;
            }

            const tagContent = text.substring(bracketIdx + 1, closeBracketIdx);
            tokens.push({ type: 'tag', value: tagContent });
            i = closeBracketIdx + 1;
        }

        return tokens;
    }

    parseTokens(tokens) {
        const result = this.parseTokensRecursive(tokens, 0);
        return result.html;
    }

    parseTokensRecursive(tokens, startIdx) {
        let html = '';
        let i = startIdx;

        while (i < tokens.length) {
            const token = tokens[i];

            if (token.type === 'text') {
                html += this.escapeHtml(token.value);
                i++;
            } else if (token.type === 'tag') {
                if (token.value.startsWith('/')) {
                    return { html, nextIdx: i };
                }

                const { tagName, param } = this.parseTagContent(token.value);
                const closeTagName = `/${tagName}`;
                let closeIdx = -1;

                for (let j = i + 1; j < tokens.length; j++) {
                    if (tokens[j].type === 'tag' && tokens[j].value.toLowerCase() === closeTagName.toLowerCase()) {
                        closeIdx = j;
                        break;
                    }
                }

                if (closeIdx !== -1) {
                    const inner = this.parseTokensRecursive(tokens, i + 1);
                    const tagHtml = this.renderTag(tagName, param, inner.html);
                    html += tagHtml;
                    i = closeIdx + 1;
                } else {
                    html += this.escapeHtml('[' + token.value + ']');
                    i++;
                }
            }
        }

        return { html, nextIdx: i };
    }

    parseTagContent(content) {
        const equalIdx = content.indexOf('=');
        let tagName, param = '';

        if (equalIdx !== -1) {
            tagName = content.substring(0, equalIdx).toLowerCase().trim();
            param = content.substring(equalIdx + 1).trim();
        } else {
            tagName = content.toLowerCase().trim();
        }

        return { tagName, param };
    }

    renderTag(tagName, param, innerHtml) {
        switch (tagName) {
            case 'b':
                return `<strong>${innerHtml}</strong>`;
            case 'i':
                return `<em>${innerHtml}</em>`;
            case 'u':
                return `<u>${innerHtml}</u>`;
            case 'color':
                return `<span style="color: ${this.escapeHtml(param)}">${innerHtml}</span>`;
            case 'size':
                const size = parseFloat(param);
                const pxSize = size + 4; // Maps 1-20 to 5-24px
                return `<span style="font-size: ${pxSize}px">${innerHtml}</span>`;
            case 'left':
                return `<div style="text-align: left">${innerHtml}</div>`;
            case 'center':
                return `<div style="text-align: center">${innerHtml}</div>`;
            case 'right':
                return `<div style="text-align: right">${innerHtml}</div>`;
            case 'url':
                return `<a href="${this.escapeHtml(param)}" target="_blank" style="color: #667eea; text-decoration: underline;">${innerHtml}</a>`;
            case 'img':
                // For [img]URL[/img], the URL is in innerHtml, not param
                const imgSrc = param || innerHtml.trim();
                return `<img src="${this.escapeHtml(imgSrc)}" style="max-width: 100%; max-height: 400px; border-radius: 5px; margin: 10px 0;" alt="Image" onerror="this.style.display='none'">`;
            case 'list':
                // Process list items: [*]item becomes <li>item</li>
                const listItems = innerHtml.split('[*]').filter(item => item.trim() !== '');
                const processedItems = listItems.map(item => `<li>${item.trim()}</li>`).join('\n');
                return `<ul style="margin: 10px 0; padding-left: 20px;">${processedItems}</ul>`;
            default:
                return `[${tagName}]${innerHtml}[/${tagName}]`;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    
    const parser = new BBCodeParser();
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');

    console.log('Editor:', editor);
    console.log('Preview:', preview);

    const commonUnicodeChars = [
        '→', '←', '↑', '↓', '⇒', '⇐', '⇑', '⇓',
        '✓', '✗', '★', '☆', '●', '○', '♠', '♣', '♥', '♦',
        '±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '√', '∑',
        '€', '£', '¥', '₹', '₽', '¢',
        'á', 'é', 'í', 'ó', 'ú', 'à', 'è', 'ì', 'ò', 'ù',
        'ä', 'ë', 'ï', 'ö', 'ü', 'ñ', 'ç',
        '°', '§', '¶', '†', '‡', '•', '…', '‰', '′', '″',
        '«', '»', '‹', '›', '„', '‚', '"', '"', "'", "'",
        'ﬁ', 'ﬂ',
        '☺', '☻', '♫', '♬', '♭', '♮', '♯', '©', '®', '™',
        '▲', '▼', '◄', '►', '■', '□', '▪', '▫', '◆', '◇', '○', '◌'
    ];

    function updatePreview() {
        console.log('updatePreview called');
        const bbcode = editor.value;
        console.log('BBCode content:', bbcode);
        if (bbcode.trim() === '') {
            preview.innerHTML = '<p style="color: #999; text-align: center;">Preview will appear here...</p>';
        } else {
            const html = parser.parse(bbcode);
            console.log('Parsed HTML:', html);
            preview.innerHTML = html;
        }
    }

    function wrapSelection(openTag, closeTag) {
        console.log('wrapSelection called with:', openTag, closeTag);
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const selectedText = text.substring(start, end) || 'text';
        const newText = text.substring(0, start) + openTag + selectedText + closeTag + text.substring(end);
        
        editor.value = newText;
        editor.focus();
        editor.selectionStart = start + openTag.length;
        editor.selectionEnd = start + openTag.length + selectedText.length;
        console.log('New text:', editor.value);
    }

    function insertAtCursor(text) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const beforeText = editor.value.substring(0, start);
        const afterText = editor.value.substring(end);
        editor.value = beforeText + text + afterText;
        editor.focus();
        editor.selectionStart = start + text.length;
    }

    function populateUnicodeGrid() {
        const grid = document.getElementById('unicodeGrid');
        grid.innerHTML = '';
        displayUnicodeChars(commonUnicodeChars);
    }

    function displayUnicodeChars(chars) {
        const grid = document.getElementById('unicodeGrid');
        grid.innerHTML = '';

        chars.forEach(char => {
            const btn = document.createElement('button');
            btn.className = 'unicode-char';
            btn.textContent = char;
            btn.type = 'button';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                insertAtCursor(char);
                document.getElementById('unicodeModal').classList.add('hidden');
            });
            grid.appendChild(btn);
        });
    }

    // Formatting buttons
    console.log('Setting up event listeners');
    
    document.getElementById('boldBtn').addEventListener('click', () => {
        console.log('Bold button clicked');
        wrapSelection('[b]', '[/b]');
    });
    
    document.getElementById('italicBtn').addEventListener('click', () => {
        console.log('Italic button clicked');
        wrapSelection('[i]', '[/i]');
    });
    
    document.getElementById('underlineBtn').addEventListener('click', () => {
        console.log('Underline button clicked');
        wrapSelection('[u]', '[/u]');
    });

    document.getElementById('leftBtn').addEventListener('click', () => {
        console.log('Left button clicked');
        wrapSelection('[left]', '[/left]');
    });
    
    document.getElementById('centerBtn').addEventListener('click', () => {
        console.log('Center button clicked');
        wrapSelection('[center]', '[/center]');
    });
    
    document.getElementById('rightBtn').addEventListener('click', () => {
        console.log('Right button clicked');
        wrapSelection('[right]', '[/right]');
    });

    document.getElementById('colorBtn').addEventListener('click', () => {
        console.log('Color button clicked');
        const color = document.getElementById('colorPicker').value;
        wrapSelection(`[color=${color}]`, '[/color]');
    });

    document.getElementById('sizeBtn').addEventListener('click', () => {
        console.log('Size button clicked');
        const size = document.getElementById('fontSizeInput').value;
        if (size && size >= 1 && size <= 20) {
            wrapSelection(`[size=${size}]`, '[/size]');
            document.getElementById('fontSizeInput').value = '';
        } else {
            alert('Please enter a font size between 1 and 20');
        }
    });

    document.getElementById('urlBtn').addEventListener('click', () => {
        console.log('URL button clicked');
        document.getElementById('urlModal').classList.remove('hidden');
        document.getElementById('urlInput').focus();
    });

    document.getElementById('imgBtn').addEventListener('click', () => {
        console.log('Image button clicked');
        document.getElementById('imgModal').classList.remove('hidden');
        document.getElementById('imgInput').focus();
    });

    document.getElementById('listBtn').addEventListener('click', () => {
        console.log('List button clicked');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const selectedText = text.substring(start, end);
        
        let listContent = '';
        if (selectedText.trim()) {
            // If text is selected, create list items from each line
            const lines = selectedText.split('\n').filter(line => line.trim());
            listContent = lines.map(line => `[*]${line.trim()}`).join('\n');
        } else {
            // If nothing selected, create a template
            listContent = '[*]Item 1\n[*]Item 2\n[*]Item 3';
        }
        
        const listTag = `[list]\n${listContent}\n[/list]`;
        
        const beforeText = text.substring(0, start);
        const afterText = text.substring(end);
        editor.value = beforeText + listTag + afterText;
        editor.focus();
    });

    document.getElementById('unicodeBtn').addEventListener('click', () => {
        console.log('Unicode button clicked');
        document.getElementById('unicodeModal').classList.remove('hidden');
        populateUnicodeGrid();
    });

    // Update Preview button
    document.getElementById('updatePreviewBtn').addEventListener('click', () => {
        console.log('Update Preview button clicked');
        updatePreview();
    });

    // Copy to clipboard
    document.getElementById('copyBtn').addEventListener('click', () => {
        const text = editor.value;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    });

    // Clear all
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all text?')) {
            editor.value = '';
            updatePreview();
        }
    });

    // URL Modal
    document.getElementById('closeUrlModal').addEventListener('click', () => {
        document.getElementById('urlModal').classList.add('hidden');
    });

    document.getElementById('insertUrlBtn').addEventListener('click', () => {
        const url = document.getElementById('urlInput').value;
        const text = document.getElementById('urlText').value;

        if (url) {
            const tag = text ? `[url=${url}]${text}[/url]` : `[url=${url}][/url]`;
            insertAtCursor(tag);
            document.getElementById('urlModal').classList.add('hidden');
            document.getElementById('urlInput').value = '';
            document.getElementById('urlText').value = '';
        } else {
            alert('Please enter a URL');
        }
    });

    document.getElementById('urlInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('insertUrlBtn').click();
    });

    // Image Modal
    document.getElementById('closeImgModal').addEventListener('click', () => {
        document.getElementById('imgModal').classList.add('hidden');
    });

    document.getElementById('insertImgBtn').addEventListener('click', () => {
        const url = document.getElementById('imgInput').value;

        if (url) {
            insertAtCursor(`[img]${url}[/img]`);
            document.getElementById('imgModal').classList.add('hidden');
            document.getElementById('imgInput').value = '';
        } else {
            alert('Please enter an image URL');
        }
    });

    document.getElementById('imgInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('insertImgBtn').click();
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        const urlModal = document.getElementById('urlModal');
        const imgModal = document.getElementById('imgModal');
        const unicodeModal = document.getElementById('unicodeModal');

        if (e.target === urlModal) urlModal.classList.add('hidden');
        if (e.target === imgModal) imgModal.classList.add('hidden');
        if (e.target === unicodeModal) unicodeModal.classList.add('hidden');
    });

    // Unicode search
    document.getElementById('unicodeSearch').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();

        if (search.length === 0) {
            displayUnicodeChars(commonUnicodeChars);
        } else if (search.length === 1) {
            const chars = [search, ...commonUnicodeChars];
            displayUnicodeChars(chars);
        } else {
            const unicodeNames = {
                'arrow': ['→', '←', '↑', '↓', '⇒', '⇐', '⇑', '⇓'],
                'star': ['★', '☆'],
                'heart': ['♥'],
                'check': ['✓'],
                'cross': ['✗'],
                'circle': ['●', '○'],
                'square': ['■', '□'],
                'triangle': ['▲', '▼']
            };

            let filtered = [];
            Object.entries(unicodeNames).forEach(([name, chars]) => {
                if (name.includes(search)) {
                    filtered.push(...chars);
                }
            });

            displayUnicodeChars(filtered.length > 0 ? filtered : commonUnicodeChars);
        }
    });

    // Close unicode modal
    document.getElementById('closeUnicodeModal').addEventListener('click', () => {
        document.getElementById('unicodeModal').classList.add('hidden');
    });

    // ========================
    // TeamSpeak 3 Panel Functionality
    // ========================
    const ts3Inputs = {
        host: document.getElementById('ts3Host'),
        port: document.getElementById('ts3Port'),
        nickname: document.getElementById('ts3Nickname'),
        password: document.getElementById('ts3Password'),
        channel: document.getElementById('ts3Channel'),
        channelId: document.getElementById('ts3ChannelId'),
        channelPassword: document.getElementById('ts3ChannelPassword'),
        token: document.getElementById('ts3Token'),
        bookmark: document.getElementById('ts3Bookmark')
    };

    const ts3Elements = {
        urlText: document.getElementById('ts3URL'),
        bbcodeText: document.getElementById('ts3BBCode'),
        joinBtn: document.getElementById('ts3JoinBtn'),
        joinCopyBtn: document.getElementById('ts3JoinCopyBtn'),
        copyUrlBtn: document.getElementById('ts3CopyUrlBtn'),
        copyBbCodeBtn: document.getElementById('ts3CopyBbCodeBtn')
    };

    // Function to generate TS3 URL
    function generateTS3URL() {
        const host = ts3Inputs.host.value.trim();
        const port = ts3Inputs.port.value.trim();
        const nickname = ts3Inputs.nickname.value.trim();
        const password = ts3Inputs.password.value.trim();
        const channel = ts3Inputs.channel.value.trim();
        const channelId = ts3Inputs.channelId.value.trim();
        const channelPassword = ts3Inputs.channelPassword.value.trim();
        const token = ts3Inputs.token.value.trim();
        const bookmark = ts3Inputs.bookmark.value.trim();

        if (!host) {
            return '';
        }

        // Build the base URL
        let url = `ts3server://${host}`;

        // Add parameters
        const params = [];

        if (port && port !== '9987') {
            params.push(`port=${port}`);
        }

        if (nickname) {
            params.push(`nickname=${encodeURIComponent(nickname)}`);
        }

        if (password) {
            params.push(`password=${encodeURIComponent(password)}`);
        }

        if (channelId) {
            params.push(`cid=${channelId}`);
        } else if (channel) {
            params.push(`channel=${encodeURIComponent(channel)}`);
        }

        if (channelPassword) {
            params.push(`channelpassword=${encodeURIComponent(channelPassword)}`);
        }

        if (token) {
            params.push(`token=${encodeURIComponent(token)}`);
        }

        if (bookmark) {
            params.push(`addbookmark=${encodeURIComponent(bookmark)}`);
        }

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        return url;
    }

    // Function to generate BBCode
    function generateBBCode() {
        const url = generateTS3URL();
        if (!url) return '';
        
        const host = ts3Inputs.host.value.trim();
        const port = ts3Inputs.port.value.trim() || '9987';
        const bookmarkLabel = ts3Inputs.bookmark.value.trim() || `${host}:${port}`;

        return `[url=${url}]Click to join ${bookmarkLabel}[/url]`;
    }

    // Function to update the URL display
    function updateTS3Display() {
        const url = generateTS3URL();
        ts3Elements.urlText.value = url;
        ts3Elements.bbcodeText.value = generateBBCode();
    }

    // Function to copy text to clipboard
    function copyToClipboard(text) {
        if (!text) {
            alert('Nothing to copy. Please fill in the server address.');
            return false;
        }

        navigator.clipboard.writeText(text).then(() => {
            // Create a temporary notification
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
        });

        return true;
    }

    // Add event listeners to all TS3 inputs for real-time update
    Object.values(ts3Inputs).forEach(input => {
        input.addEventListener('input', updateTS3Display);
        input.addEventListener('change', updateTS3Display);
    });

    // Copy URL button
    ts3Elements.copyUrlBtn.addEventListener('click', () => {
        copyToClipboard(ts3Elements.urlText.value);
    });

    // Copy BBCode button
    ts3Elements.copyBbCodeBtn.addEventListener('click', () => {
        copyToClipboard(ts3Elements.bbcodeText.value);
    });

    // Join button - opens the TS3 URL
    ts3Elements.joinBtn.addEventListener('click', () => {
        const url = generateTS3URL();
        if (!url) {
            alert('Please enter a server address.');
            return;
        }
        window.location.href = url;
    });

    // Join & Copy button - opens TS3 URL and copies BBCode
    ts3Elements.joinCopyBtn.addEventListener('click', () => {
        const url = generateTS3URL();
        if (!url) {
            alert('Please enter a server address.');
            return;
        }

        // Copy BBCode
        const bbcode = generateBBCode();
        navigator.clipboard.writeText(bbcode).then(() => {
            // Show feedback and then open the TS3 URL
            const btn = ts3Elements.joinCopyBtn;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied & Joining...';
            setTimeout(() => {
                window.location.href = url;
            }, 500);
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Still open TS3 even if copy failed
            window.location.href = url;
        });
    });

    // Initialize display on page load
    updateTS3Display();

    console.log('All event listeners attached');
});

console.log('Script initialization complete');
