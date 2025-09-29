import { AgenticWorkflow } from './workflow/index.js';

async function main() {
    // Configuration options
    const options = {
        // Set to true to use static data files instead of GitHub API
        useStaticData: process.env.USE_STATIC_DATA === 'true' || false,
        
        // GitHub configuration (if using real data)
        githubUsername: process.env.GITHUB_USERNAME || null, // Leave null to use authenticated user
        githubToken: process.env.GITHUB_TOKEN || null, // Required for authenticated requests
        
        // Other options
        recommendationCount: 3
    };

    console.log('🚀 Starting Agentic AI Workflow');
    console.log('📊 Configuration:');
    console.log(`   - Use static data: ${options.useStaticData}`);
    console.log(`   - GitHub username: ${options.githubUsername || 'authenticated user'}`);
    console.log(`   - GitHub token configured: ${!!options.githubToken}`);
    console.log('');

    const workflow = new AgenticWorkflow(options);
    
    try {
        await workflow.initialize();
        const result = await workflow.executeWorkflow();
        
        if (result.success) {
            console.log('\n🎉 Workflow completed successfully!');
            console.log('Final recommendations:', result.recommendations);
            console.log('Message hash:', result.messageHash);
            console.log('HCS details:', {
                topicId: result.hcsResult.topicId,
                sequenceNumber: result.hcsResult.sequenceNumber
            });

            // Additional info about the analyzed data
            if (result.userData && result.repoData) {
                console.log('\n📊 Analysis Summary:');
                console.log(`   - User: ${result.userData.username}`);
                console.log(`   - Repositories analyzed: ${result.repoData.repositories.length}`);
                console.log(`   - Top languages: ${result.userData.skills.languages.slice(0, 3).join(', ')}`);
                console.log(`   - Interests: ${result.userData.skills.interests.slice(0, 5).join(', ')}`);
            }
        } else {
            console.error('\n❌ Workflow failed:', result.error);
        }
    } catch (error) {
        console.error('Fatal error:', error);
        
        // Fallback to static data if GitHub API fails
        if (error.message.includes('GitHub') && !options.useStaticData) {
            console.log('\n🔄 Attempting fallback to static data...');
            options.useStaticData = true;
            const fallbackWorkflow = new AgenticWorkflow(options);
            
            try {
                await fallbackWorkflow.initialize();
                const fallbackResult = await fallbackWorkflow.executeWorkflow();
                
                if (fallbackResult.success) {
                    console.log('✅ Fallback workflow completed successfully!');
                    console.log('Final recommendations:', fallbackResult.recommendations);
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            } finally {
                await fallbackWorkflow.cleanup();
            }
        }
    } finally {
        await workflow.cleanup();
    }
}

main().catch(console.error);