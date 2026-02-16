import axios from 'axios';
import 'dotenv/config';

const FEC_API_KEY = process.env.FEC_API_KEY;
const BASE_URL = 'https://api.open.fec.gov/v1';

async function testFECAPI() {
    try {
    // Test 1: Get Indiana Senate candidates for 2024
    const response = await axios.get(`${BASE_URL}/candidates/`, {
        params: {
        api_key: FEC_API_KEY,
        office: 'S',
        state: 'IN',
        cycle: 2024,
        per_page: 10
        }
    });
    
    console.log('✅ FEC API Connection Successful');
    console.log(`Found ${response.data.pagination.count} candidates`);
    console.log('\nSample candidate:');
    console.log(JSON.stringify(response.data.results[0], null, 2));
    
    // Test 2: Get House candidates
    const houseResponse = await axios.get(`${BASE_URL}/candidates/`, {
        params: {
        api_key: FEC_API_KEY,
        office: 'H',
        state: 'IN',
        cycle: 2024,
        per_page: 20
        }
    });
    
    console.log(`\n✅ Found ${houseResponse.data.pagination.count} House candidates`);
    
    } catch (error) {
    console.error('❌ FEC API Error:', error.message);
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
    }
    }
}

testFECAPI();