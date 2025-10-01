
import { SmartCodeGeneratorAgent } from './core/smartGeneratorAgent';
import { CodeGenState } from './core/state';
import { generateId } from '../utils/idGenerator';
import { StructuredLogger } from '../logger';
import { InferenceContext } from './inferutils/config.types';
import { selectTemplate } from './planning/templateSelector';
import { TemplateDetails } from '../services/sandbox/sandboxTypes';
import { TemplateSelection } from './schemas';

export async function getAgentStub(env: Env, agentId: string, _searchInOtherJurisdictions: boolean = false, logger: StructuredLogger) : Promise<DurableObjectStub<SmartCodeGeneratorAgent>> {
    // For now, ignore searchInOtherJurisdictions since jurisdiction is not supported in the current type definitions
    logger.info(`Agent ${agentId} retrieved directly`);
    const id = env.CodeGenObject.idFromName(agentId);
    return env.CodeGenObject.get(id, {
        locationHint: 'enam' as DurableObjectLocationHint
    });
}

export async function getAgentState(env: Env, agentId: string, searchInOtherJurisdictions: boolean = false, logger: StructuredLogger) : Promise<CodeGenState> {
    const agentInstance = await getAgentStub(env, agentId, searchInOtherJurisdictions, logger);
    return agentInstance.getFullState() as CodeGenState;
}

export async function cloneAgent(env: Env, agentId: string, logger: StructuredLogger) : Promise<{newAgentId: string, newAgent: DurableObjectStub<SmartCodeGeneratorAgent>}> {
    const agentInstance = await getAgentStub(env, agentId, true, logger);
    if (!agentInstance || !await agentInstance.isInitialized()) {
        throw new Error(`Agent ${agentId} not found`);
    }
    const newAgentId = generateId();

    const newAgent = await getAgentStub(env, newAgentId, false, logger);
    const originalState = await agentInstance.getFullState() as CodeGenState;
    const newState = {
        ...originalState,
        sessionId: newAgentId,
        sandboxInstanceId: undefined,
        pendingUserInputs: [],
        currentDevState: 0,
        generationPromise: undefined,
        shouldBeGenerating: false,
        // latestScreenshot: undefined,
        clientReportedErrors: [],
    };

    await newAgent.setState(newState);
    return {newAgentId, newAgent};
}

export async function getTemplateForQuery(
    env: Env,
    inferenceContext: InferenceContext,
    query: string,
    logger: StructuredLogger,
) : Promise<{sandboxSessionId: string, templateDetails: TemplateDetails, selection: TemplateSelection}> {
    // Directly fetch templates from R2 bucket
    let templates;
    try {
        const response = await env.TEMPLATES_BUCKET.get('template_catalog.json');
        if (!response) {
            throw new Error('Template catalog not found in R2 bucket');
        }
        templates = await response.json() as any[];
        logger.info('Fetched templates from R2', { count: templates.length });
    } catch (error) {
        logger.error('Failed to fetch templates from R2', { error });
        throw new Error('Failed to fetch templates from sandbox service');
    }

    const sandboxSessionId = generateId();
        
    const [analyzeQueryResponse] = await Promise.all([
            selectTemplate({
                env: env,
                inferenceContext,
                query,
                availableTemplates: templates,
            })
        ]);
        
        logger.info('Selected template', { selectedTemplate: analyzeQueryResponse });
            
        // Find the selected template by name in the available templates
        if (!analyzeQueryResponse.selectedTemplateName) {
            logger.error('No suitable template found for code generation');
            throw new Error('No suitable template found for code generation');
        }
            
        const selectedTemplate = templates.find(template => template.name === analyzeQueryResponse.selectedTemplateName);
        if (!selectedTemplate) {
            logger.error('Selected template not found');
            throw new Error('Selected template not found');
        }
        // For now, create a minimal template details object
        // TODO: Fetch actual template files from GitHub or another source
        const templateDetails: TemplateDetails = {
            name: selectedTemplate.name,
            description: {
                selection: selectedTemplate.description || 'Template for code generation',
                usage: `Use this template for ${selectedTemplate.language || 'web'} development`
            },
            files: [],
            fileTree: { 
                path: '/', 
                type: 'directory', 
                children: [] 
            },
            language: selectedTemplate.language,
            frameworks: selectedTemplate.frameworks || [],
            deps: {},
            dontTouchFiles: [],
            redactedFiles: []
        };
        
        logger.info('Using minimal template details', { templateName: selectedTemplate.name });
        return { sandboxSessionId, templateDetails, selection: analyzeQueryResponse };
}