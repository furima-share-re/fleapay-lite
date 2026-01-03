// lib/llm/config.ts
// タスク別推奨設定

import type { TaskType as TaskTypeFromTypes, LLMProvider, ChatCompletionOptions } from './types';

// 型エイリアスを使用してインポート（再エクスポート）
export type TaskType = TaskTypeFromTypes;

/**
 * タスク設定
 */
export interface TaskConfig {
  taskType: TaskType;
  preferredProvider: LLMProvider;
  preferredModel: string;
  fallbackProviders?: LLMProvider[];
  options?: Partial<ChatCompletionOptions>;
}

/**
 * タスク別推奨設定
 * 
 * プロジェクトごとに環境変数で上書き可能:
 * - LLM_TASK_<TASK_TYPE>_PROVIDER
 * - LLM_TASK_<TASK_TYPE>_MODEL
 */
export const TASK_RECOMMENDATIONS: Record<TaskType, TaskConfig> = {
  'image-analysis': {
    taskType: 'image-analysis',
    preferredProvider: (process.env.LLM_TASK_IMAGE_ANALYSIS_PROVIDER as LLMProvider) || 'openai',
    preferredModel: process.env.LLM_TASK_IMAGE_ANALYSIS_MODEL || 'gpt-4o',
    fallbackProviders: ['gemini', 'anthropic'],
    options: {
      temperature: 0.1,
      max_tokens: 500,
    },
  },
  'image-generation': {
    taskType: 'image-generation',
    preferredProvider: (process.env.LLM_TASK_IMAGE_GENERATION_PROVIDER as LLMProvider) || 'openai',
    preferredModel: process.env.LLM_TASK_IMAGE_GENERATION_MODEL || 'dall-e-3',
    fallbackProviders: [],
    options: {
      size: '1024x1024',
    },
  },
  'image-edit': {
    taskType: 'image-edit',
    preferredProvider: (process.env.LLM_TASK_IMAGE_EDIT_PROVIDER as LLMProvider) || 'openai',
    preferredModel: process.env.LLM_TASK_IMAGE_EDIT_MODEL || 'dall-e-2',
    fallbackProviders: [],
    options: {
      size: '1024x1024',
    },
  },
  'text-generation': {
    taskType: 'text-generation',
    preferredProvider: (process.env.LLM_TASK_TEXT_GENERATION_PROVIDER as LLMProvider) || 'openai',
    preferredModel: process.env.LLM_TASK_TEXT_GENERATION_MODEL || 'gpt-4o',
    fallbackProviders: ['anthropic', 'gemini'],
    options: {
      temperature: 0.7,
      max_tokens: 1000,
    },
  },
  'long-context': {
    taskType: 'long-context',
    preferredProvider: (process.env.LLM_TASK_LONG_CONTEXT_PROVIDER as LLMProvider) || 'anthropic',
    preferredModel: process.env.LLM_TASK_LONG_CONTEXT_MODEL || 'claude-3-opus',
    fallbackProviders: ['openai'],
    options: {
      temperature: 0.7,
      max_tokens: 4096,
    },
  },
  'code-generation': {
    taskType: 'code-generation',
    preferredProvider: (process.env.LLM_TASK_CODE_GENERATION_PROVIDER as LLMProvider) || 'openai',
    preferredModel: process.env.LLM_TASK_CODE_GENERATION_MODEL || 'gpt-4o',
    fallbackProviders: ['anthropic'],
    options: {
      temperature: 0.2,
      max_tokens: 2000,
    },
  },
  'json-extraction': {
    taskType: 'json-extraction',
    preferredProvider: (process.env.LLM_TASK_JSON_EXTRACTION_PROVIDER as LLMProvider) || 'openai',
    preferredModel: process.env.LLM_TASK_JSON_EXTRACTION_MODEL || 'gpt-4o',
    fallbackProviders: ['anthropic'],
    options: {
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    },
  },
  'cost-optimized': {
    taskType: 'cost-optimized',
    preferredProvider: (process.env.LLM_TASK_COST_OPTIMIZED_PROVIDER as LLMProvider) || 'gemini',
    preferredModel: process.env.LLM_TASK_COST_OPTIMIZED_MODEL || 'gemini-pro',
    fallbackProviders: ['openai'],
    options: {
      temperature: 0.5,
      max_tokens: 500,
    },
  },
};

/**
 * タスク設定を取得
 */
export function getTaskConfig(taskType: TaskType): TaskConfig {
  return TASK_RECOMMENDATIONS[taskType];
}

/**
 * タスク設定をカスタマイズ
 */
export function customizeTaskConfig(
  taskType: TaskType,
  customConfig: Partial<TaskConfig>
): TaskConfig {
  return {
    ...TASK_RECOMMENDATIONS[taskType],
    ...customConfig,
  };
}

