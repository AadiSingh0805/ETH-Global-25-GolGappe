import { AgenticWorkflow } from './workflow/index.js';

async function main() {
    const workflow = new AgenticWorkflow();
    
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
        } else {
            console.error('\n❌ Workflow failed:', result.error);
        }
    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await workflow.cleanup();
    }
}

main().catch(console.error);