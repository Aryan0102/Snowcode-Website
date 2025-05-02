import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yCollab } from 'y-codemirror.next';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { syntaxHighlighting } from '@codemirror/language';

const CollaborativeEditor = ({ roomName, languageSupport }) => {
    const editorRef = useRef(null);
    const viewRef = useRef(null);

    const [tabIndex, setTabIndex] = useState(0);
    const [tabs, setTabs] = useState([]);

    const ydocRef = useRef(null);
    const providerRef = useRef(null);
    const yTabs = useRef(null);

    const updateTabs = () => setTabs(yTabs.current.toArray());

    useEffect(() => {
        ydocRef.current = new Y.Doc();
        const serverUrl = import.meta.env.VITE_WS_SERVER_URL;
        providerRef.current = new WebsocketProvider(serverUrl, roomName, ydocRef.current);
        
        yTabs.current = ydocRef.current.getArray('tabs');
        if (yTabs.current.length === 0) {
            const text = new Y.Text();
            const map = new Y.Map();
            map.set('name', 'Tab 1');
            map.set('content', text);
            yTabs.current.push([map]);
        }

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

        const newState = EditorState.create({
            doc: ytext.toString(),
            extensions: [
                basicSetup,
                languageSupport || [],
                syntaxHighlighting(defaultHighlightStyle),
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
            <p className="text-center text-gray-400 text-sm py-2">
                Room: <span className="text-white font-mono">{roomName}</span>
            </p>
        </div>
    );
};

export default CollaborativeEditor;