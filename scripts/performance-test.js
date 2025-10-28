#!/usr/bin/env node

/**
 * Simple performance testing script for the healthcare web app
 * Tests key endpoints and measures response times
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test endpoints
const endpoints = [
  { path: '/', name: 'Home Page' },
  { path: '/login', name: 'Login Page' },
  { path: '/api/auth/session', name: 'Session API' },
  // Add more endpoints as needed
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          url,
          statusCode: res.statusCode,
          responseTime,
          contentLength: data.length,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test...\n');
  console.log('Testing endpoints:');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      
      // Run multiple requests to get average
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(makeRequest(`${BASE_URL}${endpoint.path}`));
      }
      
      const responses = await Promise.all(requests);
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      const minResponseTime = Math.min(...responses.map(r => r.responseTime));
      const maxResponseTime = Math.max(...responses.map(r => r.responseTime));
      
      const result = {
        name: endpoint.name,
        path: endpoint.path,
        avgResponseTime: Math.round(avgResponseTime),
        minResponseTime,
        maxResponseTime,
        statusCode: responses[0].statusCode,
        contentLength: responses[0].contentLength
      };
      
      results.push(result);
      
      console.log(`  ✅ ${endpoint.name}: ${result.avgResponseTime}ms (avg), Status: ${result.statusCode}`);
      
    } catch (error) {
      console.log(`  ❌ ${endpoint.name}: Error - ${error.message}`);
      results.push({
        name: endpoint.name,
        path: endpoint.path,
        error: error.message
      });
    }
  }
  
  console.log('\n📊 Performance Test Results:');
  console.log('================================');
  
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.name}: ${result.error}`);
    } else {
      const performance = result.avgResponseTime < 200 ? '🟢 Excellent' :
                         result.avgResponseTime < 500 ? '🟡 Good' :
                         result.avgResponseTime < 1000 ? '🟠 Fair' : '🔴 Slow';
      
      console.log(`${performance} ${result.name}: ${result.avgResponseTime}ms avg (${result.minResponseTime}-${result.maxResponseTime}ms)`);
    }
  });
  
  // Calculate overall performance score
  const validResults = results.filter(r => !r.error);
  if (validResults.length > 0) {
    const overallAvg = validResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / validResults.length;
    console.log(`\n🎯 Overall Average Response Time: ${Math.round(overallAvg)}ms`);
    
    if (overallAvg < 300) {
      console.log('🚀 Performance Grade: A+ (Excellent)');
    } else if (overallAvg < 500) {
      console.log('✅ Performance Grade: A (Very Good)');
    } else if (overallAvg < 800) {
      console.log('⚠️  Performance Grade: B (Good)');
    } else {
      console.log('🐌 Performance Grade: C (Needs Improvement)');
    }
  }
  
  console.log('\n✨ Performance test completed!');
}

// Run the test
runPerformanceTest().catch(console.error);