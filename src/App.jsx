import React, { useEffect, useState } from 'react';
import CollaborativeEditor from './components/CollaborativeEditor';
import { languages } from '@codemirror/language-data';
import Select from 'react-select'

const App = () => {
  // Main state variables
  const [roomCode, setRoomCode] = useState(''); // Room code for the collaborative editor
  const [joined, setJoined] = useState(false); // Flag to check if the user has joined a room
  const [selectedLang, setSelectedLang] = useState(null); // Selected programming language
  const [languageSupport, setLanguageSupport] = useState(null); // Language support for the editor
  const [userName, setUserName] = useState(''); // User's name for the collaborative editor
  const [allRoomCode, setAllRoomCode] = useState({}); // All previously created room codes

  // Function to fetch all room codes from local storage and sort them by timestamp
  const fetchAllRoomCode = () => {
    const storedCodes = localStorage.getItem('allRoomCode');
    if (storedCodes) {
      const parsedCodes = JSON.parse(storedCodes); // Parse the stored room codes to objects

      const entries = Object.entries(parsedCodes);
      entries.sort((entryA, entryB) => { // Sort the entries by timestamp
        console.log(entryA, entryB);
        const timestampA = new Date(entryA[1].timestamp);
        const timestampB = new Date(entryB[1].timestamp);
        return timestampB - timestampA;
      });
      const sorted = Object.fromEntries(entries); // Convert the sorted entries back to an object
      setAllRoomCode(sorted); // Set the sorted room codes to state
    }
  };

  // Function to save the room code and user data to local storage
  const saveCodeToLocalStorage = (roomCode) => {
    const timestamp = new Date().toISOString(); // Get the current timestamp

    const currentLocalStorage = JSON.parse(localStorage.getItem('allRoomCode') || '{}'); // Get the current room codes from local storage

    const updated = { // Create a new object with the current room codes
      ...currentLocalStorage,
      [roomCode]: {
        storedUsername: userName,
        timestamp,
        storedSelectedLang: selectedLang,
      },
    };

    localStorage.setItem('allRoomCode', JSON.stringify(updated)); // Save the updated room codes to local storage
    setAllRoomCode(updated); // Update the state with the new room codes
  };

  // Function to handle language selection
  // This function is called when the user selects a language from the dropdown
  const handleLanguageChange = async (selectedOption) => {
    if (!selectedOption) return;

    setSelectedLang(selectedOption); // Set the selected language to state

    // Try to find the selected language in the languages array (from @codemirror/language-data)
    const lang = languages.find(l => l.name === selectedOption.value);
    if (lang && lang.load) { // Check if the language has a load function if it does, call the load function to get the language support
      const support = await lang.load();
      setLanguageSupport(support);
    }
  };

  // Function to generate a random 10-digit room code
  const generateRoomCode = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  // Function to handle room creation
  const handleCreate = () => {
    // Check if the user has entered a name and selected a language
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!selectedLang || !languageSupport) {
      alert("Please select a language before creating a room.");
      return;
    }

    // Generate a new room code and save it to local storage
    const newCode = generateRoomCode();
    saveCodeToLocalStorage(newCode);
    setRoomCode(newCode);
    setJoined(true); // Set the joined flag to true
  };

  // Function to handle joining a room
  const handleJoin = () => {
    // Check if the user has entered a name and selected a language
    if (!userName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!selectedLang || !languageSupport) {
      alert("Please select a language before joining a room.");
      return;
    }

    // Check if the room code is valid (10 digits)
    if (roomCode.length === 10) {
      setJoined(true);
      saveCodeToLocalStorage(roomCode);
    } else {
      alert("Enter a valid 10-digit code.");
    }
  };

  // Map the languages to options for the Select component
  const languageOptions = languages.map(lang => ({
    value: lang.name,
    label: lang.name,
  }));

  // Function to handle clicking on a previous room code
  const handlePreviousRoomClick = async (code) => {
    const data = allRoomCode[code]; // Get the data for the clicked room code

    if (!data) {
      return;
    }

    setRoomCode(code); // Set the room code to the clicked room code
    setUserName(data.storedUsername || ''); // Set the user's name to the stored name
    setSelectedLang(data.storedSelectedLang || null); // Set the selected language to the stored language

    // Retrieve the language support for the stored language
    const lang = languages.find(l => l.name === data.storedSelectedLang?.value);
    if (lang && lang.load) {
      const support = await lang.load();
      setLanguageSupport(support);
    }

    setJoined(true); // Set the joined flag to true
  };

  useEffect(() => {
    fetchAllRoomCode(); // Fetch all room codes when the page loads
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A2E]">
      { /* Main Page Title */ }
      {!joined ? ( 
        <div className="bg-[#16213E] p-6 rounded-md shadow-md w-full max-w-lg">
          <h1 className="text-2xl font-bold text-center text-white mb-6">Snowcode - Collaborative Editor</h1>

          {/* Name and Language Select */}
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

          {/* Join or create room code*/}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => {
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

          {/* Render the previously joined rooms, fetched from the local storage */}
          {Object.keys(allRoomCode).length > 0 && (
            <div className="mt-6 bg-[#0f3460] text-white p-4 rounded-md w-full max-w-lg">
              <p className="text-lg font-semibold mb-2">Previous Rooms</p>
              <div className="flex flex-col gap-3 overflow-y-auto max-h-46 no-scrollbar">
                {Object.entries(allRoomCode).map(([code, { timestamp, storedSelectedLang }]) => (
                  <div
                    key={code}
                    onClick={() => handlePreviousRoomClick(code)}
                    className="cursor-pointer bg-[#19192d] rounded-md p-3 hover:bg-[#262647] transition-all"
                  >
                    <p className="text-sm font-mono text-white mb-1">{code}</p>
                    <p className="text-sm text-gray-300">Language: {storedSelectedLang?.label ?? 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{new Date(timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Collaborative Editor
        // This section is displayed when the user has joined a room
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