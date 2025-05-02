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
    const newCode = generateRoomCode();
    setRoomCode(newCode);
    setJoined(true);
  };

  const handleJoin = () => {
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
        <div className="bg-[#16213E] p-6 rounded-md shadow-md w-full max-w-md">
          <h1 className="text-xl font-bold text-center mb-4 text-white">Snowcode - Collaborative Editor</h1>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setMode('create');
                handleCreate();
              }}
              className={`bg-[#e94560] text-white py-2 rounded cursor-pointer`}
            >
              Create New Room
            </button>

            <Select
              options={languageOptions}
              value={selectedLang}
              onChange={handleLanguageChange}
              placeholder="Select language"
            />

            <div className="flex flex-col">
              <label className="text-sm mb-1 text-white">Join Existing Room</label>
              <input
                type="text"
                maxLength={10}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter 10-digit code"
                className="border rounded px-3 py-2 text-white"
              />
              <button
                onClick={handleJoin}
                className="mt-2 bg-[#e94560] text-white py-2 rounded cursor-pointer"
              >
                Join Room
              </button>
            </div>
          </div>
            
          <div className="mt-10 w-full bg-[#e94560] text-white py-2 rounded flex items-center justify-center gap-2 cursor-pointer">
            <p>Like Snowcode? VSCode Extension</p>
            <img className = "w-[10%]" src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png" alt="" />
          </div>

        </div>
      ) : (
        <div className="w-full p-4">
          <CollaborativeEditor
            roomName={roomCode}
            languageSupport={languageSupport}
          />
        </div>
      )}
    </div>
  );
};

export default App;