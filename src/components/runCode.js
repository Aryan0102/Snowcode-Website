import axios from 'axios';

// Function to run code in many languages using the piston api
export const runCode = async (language, code) => {
  try {
    // Fetch all the "runtimes" (what dockers exist for running the code)
    const runtimeResponse = await axios.get('https://emkc.org/api/v2/piston/runtimes');
    const runtimes = runtimeResponse.data;

    const runtime = runtimes.find(rt =>
      rt.language === language || (rt.aliases && rt.aliases.includes(language))
    ); // Find the language the user is writing in, check aliases

    if (!runtime) {
      throw new Error(`No runtime found for language: ${language}`);
    }

    // If a run time is found, execute the code that has been given
    const execute = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: runtime.language,
      version: runtime.version,
      files: [
        {
          name: `main.${language}`,
          content: code,
        }
      ]
    });

    return execute.data; // return the execution
  } catch (error) {
    return {
      error: true,
      message: error.response?.data?.message || error.message,
    };
  }
};
