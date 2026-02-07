import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dlishe.com/api/v1';

const api = axios.create({
    baseURL: API_URL,
});


export default api;
