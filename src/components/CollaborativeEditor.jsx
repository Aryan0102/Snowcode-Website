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

const CollaborativeEditor = ({ roomName, languageSupport, userName }) => {
    const editorRef = useRef(null);
    const viewRef = useRef(null);

    const [tabIndex, setTabIndex] = useState(0);
    const [tabs, setTabs] = useState([]);

    const ydocRef = useRef(null);
    const providerRef = useRef(null);
    const yTabs = useRef(null);

    const updateTabs = () => setTabs(yTabs.current.toArray());

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
    };

    const getExtension = () => {
        return languageSupport?.language?.name
            ? languageExtensions[languageSupport.language.name] || 'txt'
            : 'txt';
    };

    const handleDownloadCurrent = () => {
        const currentTab = tabs[tabIndex];
        if (!currentTab) return;

        const fileName = `${currentTab.get('name')}.${getExtension()}`;
        const content = currentTab.get('content').toString();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        const ext = getExtension();
    
        tabs.forEach((tab, index) => {
            const name = tab.get('name') || `file-${index + 1}`;
            const content = tab.get('content').toString();
            zip.file(`${name}.${ext}`, content);
        });
    
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'snowcode-project.zip');
    };

    useEffect(() => {
        ydocRef.current = new Y.Doc();
        const serverUrl = import.meta.env.VITE_WS_SERVER_URL;
        providerRef.current = new WebsocketProvider(serverUrl, roomName, ydocRef.current);

        providerRef.current.awareness.setLocalStateField('user', {
            name: userName,
            color: randomColor({ luminosity: 'dark' }),
        });

        yTabs.current = ydocRef.current.getArray('tabs');

        providerRef.current.once('synced', () => {
            if (yTabs.current.length === 0) {
                const text = new Y.Text();
                const map = new Y.Map();
                map.set('name', 'Tab 1');
                map.set('content', text);
                yTabs.current.push([map]);
            }
            updateTabs();
        });

        yTabs.current.observe(updateTabs);
        updateTabs();

        return () => {
            providerRef.current?.disconnect();
            ydocRef.current.destroy();
            viewRef.current?.destroy();
        };
    }, [roomName]);

    useEffect(() => {
        if (!editorRef.current || yTabs.current.length === 0) return;

        const ytext = tabs[tabIndex]?.get('content');

        if (!ytext) {
            return;
        }

        console.log(languageSupport);

        const newState = EditorState.create({
            doc: ytext.toString(),
            extensions: [
                ...(languageSupport ? [languageSupport] : []),
                basicSetup,
                oneDark,
                syntaxHighlighting(oneDarkHighlightStyle),
                yCollab(ytext, providerRef.current.awareness, {
                    undoManager: new Y.UndoManager(ytext),
                }),
            ],
        });

        if (viewRef.current) {
            viewRef.current.setState(newState);
        } else {
            viewRef.current = new EditorView({
                state: newState,
                parent: editorRef.current,
            });
        }
    }, [tabIndex, tabs])

    const addTab = () => {
        if (yTabs.current.length < 10) {
            const text = new Y.Text();
            const map = new Y.Map();
            map.set('name', `Tab ${yTabs.current.length + 1}`);
            map.set('content', text);
            yTabs.current.push([map]);
            setTabIndex(yTabs.current.length - 1);
        }
    }

    const removeTab = (index) => {
        if (yTabs.current.length > 1) {
            yTabs.current.delete(index);
            setTabIndex(Math.max(0, tabIndex - 1));
        }
    }
    return (
        <div className="w-full mx-auto mt-6 bg-[#12172A] rounded-lg shadow-md">
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
            <div
                ref={editorRef}
                className="border border-gray-700 bg-[#1c2235] h-[75vh] overflow-auto p-2 rounded-b"
            />

            {/* Room display */}
            <div className='flex flex-row items-center justify-between px-5 py-2'>
                <p className="text-center text-gray-400 text-sm py-2">
                    Room: <span className="text-white font-mono">{roomName}</span>
                </p>

                <div className="flex gap-4 justify-center">
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
    );
};

export default CollaborativeEditor;