/* js/config.js */
const CONFIG = {
    WEATHER_KEY: '77e78442346992c010ea5575880c961a',
    SUPABASE_URL: 'https://hhwzavlhzffhmfinjncq.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhod3phdmxoemZmaG1maW5qbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODc2MzEsImV4cCI6MjA5MDE2MzYzMX0.d0MegN1COnZGgpzgO_MB_DZJJvTvDVfJ6n1quZkphoI', // Use sua chave completa aqui
    
    API_KEYS: {
        SNYK: 'd22833ad-ef00-4add-90ce-c959363a1e83',
        GEMINI: "SUA-KEY-DO-GEMINI",
        SONAR: "SUA-KEY-DO-SONAR"
    }
};

// Envolva em um try/catch para não travar o sistema se o Supabase falhar
try {
    window.ssql = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log("Supabase inicializado com sucesso.");
} catch (e) {
    console.warn("Aviso: Supabase não pôde ser inicializado, mas o sistema continuará rodando.");
}
