import React, { useState } from 'react';
import CollaborativeEditor from './components/CollaborativeEditor';
import { languages } from '@codemirror/language-data';
import Select from 'react-select'

const App = () => {
  const [mode, setMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [selectedLang, setSelectedLang] = useState(null);
  const [languageSupport, setLanguageSupport] = useState(null);
  const [userName, setUserName] = useState('');

  const handleLanguageChange = async (selectedOption) => {
    if (!selectedOption) return;

    setSelectedLang(selectedOption);

    const lang = languages.find(l => l.name === selectedOption.value);
    if (lang && lang.load) {
      const support = await lang.load();
      setLanguageSupport(support);
    }
  };

  const generateRoomCode = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  const handleCreate = () => {
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!selectedLang || !languageSupport) {
      alert("Please select a language before creating a room.");
      return;
    }
    const newCode = generateRoomCode();
    setRoomCode(newCode);
    setJoined(true);
  };

  const handleJoin = () => {
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!selectedLang || !languageSupport) {
      alert("Please select a language before joining a room.");
      return;
    }
    if (roomCode.length === 10) {
      setJoined(true);
    } else {
      alert("Enter a valid 10-digit code.");
    }
  };

  const languageOptions = languages.map(lang => ({
    value: lang.name,
    label: lang.name,
  }));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A2E]">
      {!joined ? (
        <div className="bg-[#16213E] p-6 rounded-md shadow-md w-full max-w-lg">
          <h1 className="text-2xl font-bold text-center text-white mb-6">Snowcode - Collaborative Editor</h1>

          {/* Necessary Section */}
          <div className="flex flex-col gap-4 mb-6">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              className="border rounded px-3 py-2 text-white"
            />
            <Select
              options={languageOptions}
              value={selectedLang}
              onChange={handleLanguageChange}
              placeholder="Select a language"
            />
          </div>

          {/* Divider */}
          <div className="text-center text-sm text-gray-300 mb-4">Choose an option</div>

          {/* Room Actions */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => {
                setMode('create');
                handleCreate();
              }}
              className="bg-[#e94560] text-white py-2 rounded"
            >
              Create Room
            </button>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                maxLength={10}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="10-digit code"
                className="border rounded px-3 py-2 text-white"
              />
              <button
                onClick={handleJoin}
                className="bg-[#e94560] text-white py-2 rounded"
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 w-full bg-[#e94560] text-white py-2 rounded flex items-center justify-center gap-2 cursor-pointer">
            <p>Like Snowcode? VSCode Extension</p>
            <img
              className="w-6 h-6"
              src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg"
              alt="VSCode"
            />
          </div>
        </div>

      ) : (
        <div className="w-full p-4">
          <CollaborativeEditor
            roomName={roomCode}
            languageSupport={languageSupport}
            userName={userName}
          />
        </div>
      )}
    </div>
  );
};

export default App;