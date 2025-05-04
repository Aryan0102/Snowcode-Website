import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yCollab } from 'y-codemirror.next';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting } from '@codemirror/language';
import { randomColor } from 'randomcolor';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { runCode } from './runCode';
import { autocompletion } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { keymap } from '@codemirror/view';

const CollaborativeEditor = ({ roomName, languageSupport, userName }) => {
    const editorRef = useRef(null); // Reference to the CodeMirror editor (where it is embedded)
    const viewRef = useRef(null); // Reference to the CodeMirror view

    const [tabIndex, setTabIndex] = useState(0); // Index of the currently selected tab
    const [tabs, setTabs] = useState([]); // Array of tabs in the editor

    const [output, setOutput] = useState(''); // Output from the code execution
    const [stderr, setStderr] = useState(''); // Error output from the code execution

    const ydocRef = useRef(null); // Reference to the Yjs document
    const providerRef = useRef(null); // Reference to the Yjs provider
    const yTabs = useRef(null); // Reference to the Yjs array for tabs

    const [loading, setLoading] = useState(true); // Loading state for the page

    // Function to update the tabs state when the Yjs array changes
    const updateTabs = () => setTabs(yTabs.current.toArray());

    // Map of programming languages to their file extensions
    const languageExtensions = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        java: 'java',
        c: 'c',
        cpp: 'cpp',
        html: 'html',
        css: 'css',
        json: 'json',
        xml: 'xml',
        markdown: 'md',
        go: 'go',
        rust: 'rs',
        ruby: 'rb',
        php: 'php',
        shell: 'sh',
        swift: 'swift',
        kotlin: 'kt',
        perl: 'pl',
        lua: 'lua',
        r: 'r',
        sql: 'sql',
        dart: 'dart',
        pascal: 'pas',
        scala: 'scala',
        lisp: 'lisp',
        ocaml: 'ml',
        clojure: 'clj',
        yaml: 'yaml',
        toml: 'toml',
        ini: 'ini',
        bash: 'sh',
    };

    // Function to get the language extension through the predefined map and languageSupport
    const getExtension = () => {
        return languageSupport?.language?.name
            ? languageExtensions[languageSupport.language.name] || 'txt'
            : 'txt';
    };

    // Downloads the current file
    const handleDownloadCurrent = () => {
        const currentTab = tabs[tabIndex]; // get current tab
        
        if (!currentTab) {
            return;
        }

        const fileName = `${currentTab.get('name')}.${getExtension()}`; // create a file name based off tab number and code type
        const content = currentTab.get('content').toString(); // gets the content of the tab

        const blob = new Blob([content], { type: 'text/plain' }); // creates a new blob object of plain text
        const url = URL.createObjectURL(blob); // creates the url of the blob
        const link = document.createElement('a'); // adds a temporary hyperlink tag

        link.href = url; // specifies the destination of the hyperlink tag to be the previously created url
        link.download = fileName; // downloads the file
        link.click(); // downloads the file
        URL.revokeObjectURL(url); // cleans up the url
    };

    // Function to download all of the tabs
    const handleDownloadAll = async () => {
        const zip = new JSZip(); // Creates a new JSZip instance
        const ext = getExtension(); // gets the file extensions from the languageSupport

        tabs.forEach((tab, index) => {
            const name = tab.get('name') || `file-${index + 1}`;
            const content = tab.get('content').toString();
            zip.file(`${name}.${ext}`, content);
        }); // iterate through each of the files, name them, and add them to the zip

        const blob = await zip.generateAsync({ type: 'blob' }); // generate a zip of type blob
        saveAs(blob, 'snowcode-project.zip'); // save/download the zip
    };

    // Handles the inital ydoc/ymap behavior
    useEffect(() => {
        ydocRef.current = new Y.Doc(); // sets the ydocRef to a new ydoc
        const serverUrl = import.meta.env.VITE_WS_SERVER_URL; // fetches the websocket from the env
        providerRef.current = new WebsocketProvider(serverUrl, roomName, ydocRef.current); // uses the y-websocket package to setup a new room using the code and ydoc

        providerRef.current.awareness.setLocalStateField('user', {
            name: userName,
            color: randomColor({ luminosity: 'dark' }),
        }); // sets the current "user" to the given user name and a randomly generated color

        yTabs.current = ydocRef.current.getArray('tabs'); // creates the "tabs" array in the ydoc and sets it to ytabs

        // Executes only when the websocket has synced/loaded
        providerRef.current.once('synced', () => {
            if (yTabs.current.length === 0) {
                const text = new Y.Text(); // creates a new yText
                const map = new Y.Map(); // creates a new yMap
                map.set('name', 'Tab 1'); // creates the first tab
                map.set('content', text); // sets the content of the first tab
                yTabs.current.push([map]); // adds it to the yTabs
            }
            updateTabs(); // visually updates the tabs
            setLoading(false); // loads the code interface (removes the loading screen)
        });

        yTabs.current.observe(updateTabs); // sets an observer to detect whenever collaborators change tabs
        updateTabs(); // updates the tabs when collaborators join

        // handle disconnects
        return () => {
            providerRef.current?.disconnect();
            ydocRef.current.destroy();
            viewRef.current?.destroy();
        };
    }, [roomName]);

    // handles the editor state (codemirror) creation 
    useEffect(() => {
        if (!editorRef.current || yTabs.current.length === 0) {
            return;
        } // only run where there is an editorRef and active tab

        const ytext = tabs[tabIndex]?.get('content'); // current tab's yText

        if (!ytext) {
            return;
        } // only run if there is a yText

        console.log(languageSupport);

        // sets the editor view to a new CodeMirror state
        const newState = EditorState.create({
            doc: ytext.toString(), // current yText's content
            extensions: [
                ...(languageSupport ? [languageSupport] : []), // language support pack for code suggestions
                basicSetup, // inital setup like line numbers and other important features
                oneDark, // oneDark color theme
                syntaxHighlighting(oneDarkHighlightStyle), // oneDark syntax highlight
                autocompletion(), // autocomplete pack
                highlightSelectionMatches(), // highlights the matches when searching
                keymap.of(searchKeymap), // creates the search object
                yCollab(ytext, providerRef.current.awareness, { // links the codemirror to yjs (also adds awarness for cursor support)
                    undoManager: new Y.UndoManager(ytext),
                }),
            ],
        });

        if (viewRef.current) {
            viewRef.current.setState(newState); // changes the editor state to the new one if it exists
        } else {
            viewRef.current = new EditorView({ // creates a new editor view if the old state does not exist
                state: newState,
                parent: editorRef.current,
            });
        }
    }, [tabIndex, tabs])

    // Function to add a new tab
    const addTab = () => {
        if (yTabs.current.length < 10) { // tab limit to 10
            const text = new Y.Text(); // set a new yText for the tab
            const map = new Y.Map(); // new yMap for name and content
            map.set('name', `Tab ${yTabs.current.length + 1}`); // sets the name
            map.set('content', text); // sets a blank yText as content
            yTabs.current.push([map]); // pushes to yText
            setTabIndex(yTabs.current.length - 1); // fixes the tabIndex
        }
    }

    // Function to remove a tab
    const removeTab = (index) => {
        if (yTabs.current.length > 1) {
            yTabs.current.delete(index);
            setTabIndex(Math.max(0, tabIndex - 1)); // dynamically prevents a negative tab index
        }
    }

    // Function to run code using the runCode method
    const runCodeInTab = async () => {
        const currentTab = tabs[tabIndex]; // gets current tab

        if (!currentTab) {
            return;
        }

        // Gets content of the tab and the language of this room and passes it to the run code method
        const content = currentTab.get('content').toString(); 
        const language = languageSupport.language.name;
        const result = await runCode(language, content);

        // sets the results of the code in the previously defined state
        if (result?.error) {
            setOutput('');
            setStderr(result.message || 'Unknown error');
        } else {
            setOutput(result.run?.stdout || '');
            setStderr(result.run?.stderr || '');
        }
    };

    return (
        // loading screen with cool text
        loading ? (
            <div className="flex items-center justify-center h-full">
                <div className="text-green-400 font-mono text-base space-y-1">
                    <p>[ system ] Booting up Snowcode...</p>
                    <p>[ editor ] Initializing collaborative session...</p>
                    <p>[ lang   ] Loading language modules...</p>
                    <p>[ user   ] Authenticating user credentials...</p>
                    <p className="text-[#e94560] font-semibold pt-5">Loading _</p>
                </div>
            </div>
        ) : (
            // loaded code editor with "console" and editor
            <div className="w-full mx-auto mt-3 bg-[#12172A] rounded-lg shadow-md">
                {/* Tab bar */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-t">
                    {tabs.map((tab, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer transition-colors ${i === tabIndex
                                ? 'bg-[#e94560] text-white'
                                : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                                }`}
                            onClick={() => setTabIndex(i)}
                        >
                            {/* Tab close button */}
                            {tab.get('name')}
                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTab(i);
                                    }}
                                    className="text-white hover:scale-110 transition-transform"
                                    title="Close tab"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    
                    {/* Add tab button */}
                    {tabs.length < 10 && (
                        <button
                            onClick={addTab}
                            className="w-8 h-8 text-lg font-bold flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded"
                            title="Add tab"
                        >
                            +
                        </button>
                    )}
                </div>

                {/* CodeMirror editor container */}

                <div className="flex gap-4">
                    {/* CodeMirror Editor */}
                    <div
                        ref={editorRef}
                        className="border border-gray-700 bg-[#1c2235] h-[75vh] overflow-auto p-2 rounded w-3/5"
                    />

                    {/* Run Output Window */}
                    <div className="w-2/5 h-[75vh] bg-[#0f172a] text-white rounded p-4 overflow-auto border border-[#334155]">
                        <p className="text-lg font-semibold text-[#e94560] mb-2">Output</p>
                        {output && (
                            <pre className="text-sm text-green-400 whitespace-pre-wrap">{output}</pre>
                        )}
                        {stderr && (
                            <pre className="text-sm text-red-400 whitespace-pre-wrap mt-2">{stderr}</pre>
                        )}
                        {!output && !stderr && (
                            <p className="text-sm text-gray-400 italic">No output yet. Run your code to see results.</p>
                        )}
                    </div>
                </div>

                {/* Room Code / Run/ Download display */}
                <div className='flex flex-row items-center justify-between px-5 py-2'>
                    <p className="text-center text-gray-400 text-sm py-2">
                        Room: <span className="text-white font-mono">{roomName}</span>
                    </p>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={runCodeInTab}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded"
                        >
                            Run
                        </button>
                        <button
                            onClick={handleDownloadCurrent}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded"
                        >
                            Download Current Tab
                        </button>
                        <button
                            onClick={handleDownloadAll}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1 rounded"
                        >
                            Download All Tabs
                        </button>
                    </div>
                </div>
            </div>
        )
    );
};

export default CollaborativeEditor;