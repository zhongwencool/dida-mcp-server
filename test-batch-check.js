const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Config file path
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.dida-mcp-config.json');

async function testBatchCheck() {
    try {
        // Load access token from config file
        if (!fs.existsSync(CONFIG_FILE)) {
            console.error('Config file not found. Please run "npm run get-token" first.');
            return;
        }

        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

        if (!config.access_token || !config.expires_at || config.expires_at <= Date.now()) {
            console.error('Access token is missing or expired. Please run "npm run get-token" to obtain a new token.');
            return;
        }

        const accessToken = config.access_token;
        console.log('Using access token:', accessToken);

        // First try the Open API to verify the token
        console.log('Testing Open API access...');
        const openApiResponse = await fetch('https://api.dida365.com/open/v1/project', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
        });

        if (!openApiResponse.ok) {
            console.error(`Open API call failed: ${openApiResponse.status} ${openApiResponse.statusText}`);
            return;
        }

        const projects = await openApiResponse.json();
        console.log(`Open API access successful. Found ${projects.length} projects.`);

        // Now try the batch/check API call
        console.log('\nTesting v2 API access...');
        const response = await fetch('https://api.dida365.com/api/v2/batch/check/0', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `t=${accessToken}`
            },
        });

        if (!response.ok) {
            console.error(`API call failed: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();

        // Process and display the results
        console.log('\n=== API Response Structure ===');
        console.log('Response keys:', Object.keys(data));

        // Extract and display inbox ID
        console.log('\n=== Inbox ID ===');
        console.log(data.inboxId || 'Not found');

        // Extract and display project groups
        console.log('\n=== Project Groups ===');
        if (data.projectGroups && Array.isArray(data.projectGroups)) {
            console.log(`Found ${data.projectGroups.length} project groups`);

            // Map of project IDs to names
            const projectMap = new Map();

            data.projectGroups.forEach((group, index) => {
                console.log(`\nGroup ${index + 1}: ${group.name || 'Unnamed'}`);

                if (group.projects && Array.isArray(group.projects)) {
                    console.log(`  Projects in this group: ${group.projects.length}`);

                    group.projects.forEach(project => {
                        console.log(`  - ${project.name} (ID: ${project.id})`);
                        projectMap.set(project.id, project.name);
                    });
                } else {
                    console.log('  No projects in this group');
                }
            });

            console.log('\n=== Project ID to Name Mapping ===');
            console.log(Object.fromEntries(projectMap));
        } else {
            console.log('No project groups found');
        }

        // Extract and display tags
        console.log('\n=== Tags ===');
        if (data.tags && Array.isArray(data.tags)) {
            console.log(`Found ${data.tags.length} tags`);
            data.tags.forEach(tag => {
                console.log(`- ${tag.name} (Label: ${tag.label}, Color: ${tag.color || 'None'})`);
            });
        } else {
            console.log('No tags found');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testBatchCheck();
