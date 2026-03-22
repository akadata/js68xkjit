function createLineEditor(options) {
    options = options || {};
    var write = options.write || function () {};
    var onLine = options.onLine || function () {};
    var state = {
        line: '',
        cursor: 0,
        displayTail: '',
        history: [],
        historyIndex: null,
        historyDraft: '',
        escape: '',
        suppressLine: null,
        suppressPos: 0
    };

    function hasActiveLine() {
        return state.line.length !== 0 || state.cursor !== 0;
    }

    function updateDisplayTail(text) {
        for (var i = 0; i < text.length; ++i) {
            var ch = text.charAt(i);
            if (ch === '\r' || ch === '\n') {
                state.displayTail = '';
                continue;
            }
            state.displayTail += ch;
            if (state.displayTail.length > 256)
                state.displayTail = state.displayTail.slice(-256);
        }
    }

    function redrawLine() {
        write('\r\x1b[2K' + state.displayTail + state.line);
        var moveLeft = state.line.length - state.cursor;
        if (moveLeft > 0)
            write('\x1b[' + moveLeft + 'D');
    }

    function setLine(text) {
        state.line = text;
        state.cursor = text.length;
        redrawLine();
    }

    function commitLine() {
        var line = state.line;
        write('\r\n');
        if (line !== '') {
            if (state.history.length === 0 || state.history[state.history.length - 1] !== line)
                state.history.push(line);
        }
        state.historyIndex = null;
        state.historyDraft = '';
        state.line = '';
        state.cursor = 0;
        state.suppressLine = line;
        state.suppressPos = 0;
        onLine(line + '\r');
    }

    function handleHistoryUp() {
        if (state.history.length === 0)
            return;
        if (state.historyIndex === null) {
            state.historyDraft = state.line;
            state.historyIndex = state.history.length - 1;
        } else if (state.historyIndex > 0) {
            state.historyIndex -= 1;
        }
        setLine(state.history[state.historyIndex]);
    }

    function handleHistoryDown() {
        if (state.historyIndex === null)
            return;
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            setLine(state.history[state.historyIndex]);
            return;
        }
        state.historyIndex = null;
        setLine(state.historyDraft);
    }

    function handleEscape(sequence) {
        switch (sequence) {
            case '\x1b[A':
                handleHistoryUp();
                return;
            case '\x1b[B':
                handleHistoryDown();
                return;
            case '\x1b[C':
                if (state.cursor < state.line.length) {
                    state.cursor += 1;
                    write('\x1b[C');
                }
                return;
            case '\x1b[D':
                if (state.cursor > 0) {
                    state.cursor -= 1;
                    write('\x1b[D');
                }
                return;
            case '\x1b[3~':
                if (state.cursor < state.line.length) {
                    state.line = state.line.slice(0, state.cursor) + state.line.slice(state.cursor + 1);
                    redrawLine();
                }
                return;
            case '\x1b[H':
            case '\x1b[1~':
                state.cursor = 0;
                redrawLine();
                return;
            case '\x1b[F':
            case '\x1b[4~':
                state.cursor = state.line.length;
                redrawLine();
                return;
        }
    }

    function consumeSuppressedEcho(text) {
        if (state.suppressLine === null)
            return text;

        var i = 0;
        while (i < text.length && state.suppressPos < state.suppressLine.length && text.charAt(i) === state.suppressLine.charAt(state.suppressPos)) {
            i += 1;
            state.suppressPos += 1;
        }

        if (state.suppressPos !== 0 && state.suppressPos < state.suppressLine.length) {
            if (i === text.length)
                return '';
            state.suppressLine = null;
            state.suppressPos = 0;
            return text;
        }

        if (state.suppressPos === state.suppressLine.length) {
            if (text.charAt(i) === '\r')
                i += 1;
            if (text.charAt(i) === '\n')
                i += 1;
            state.suppressLine = null;
            state.suppressPos = 0;
            return text.slice(i);
        }

        if (text.length !== 0 && text.charAt(0) !== state.suppressLine.charAt(0)) {
            state.suppressLine = null;
            state.suppressPos = 0;
        }
        return text;
    }

    function handleOutput(text) {
        if (!text)
            return;
        var hadLine = hasActiveLine();
        if (hadLine)
            write('\r\x1b[2K');
        text = consumeSuppressedEcho(text);
        if (text !== '') {
            write(text);
            updateDisplayTail(text);
        }
        if (hadLine)
            redrawLine();
    }

    function handleChunk(chunk) {
        for (var i = 0; i < chunk.length; ++i) {
            var ch = chunk.charAt(i);
            var code = chunk.charCodeAt(i);

            if (state.escape !== '') {
                state.escape += ch;
                if (/^\x1b\[[0-9;]*[A-Za-z~]$/.test(state.escape) || /^\x1bO[A-Za-z]$/.test(state.escape)) {
                    handleEscape(state.escape);
                    state.escape = '';
                } else if (state.escape.length > 8) {
                    state.escape = '';
                }
                continue;
            }

            if (ch === '\x1b') {
                state.escape = '\x1b';
                continue;
            }
            if (ch === '\r' || ch === '\n') {
                commitLine();
                continue;
            }
            if (code === 0x7f || code === 0x08) {
                if (state.cursor > 0) {
                    state.line = state.line.slice(0, state.cursor - 1) + state.line.slice(state.cursor);
                    state.cursor -= 1;
                    redrawLine();
                }
                continue;
            }
            if (code === 1) {
                state.cursor = 0;
                redrawLine();
                continue;
            }
            if (code === 5) {
                state.cursor = state.line.length;
                redrawLine();
                continue;
            }
            if (code >= 32 && code !== 127) {
                state.line = state.line.slice(0, state.cursor) + ch + state.line.slice(state.cursor);
                state.cursor += 1;
                redrawLine();
            }
        }
    }

    return {
        handleChunk: handleChunk,
        handleOutput: handleOutput,
        hasActiveLine: hasActiveLine,
        _state: state
    };
}

module.exports = {
    createLineEditor: createLineEditor
};
