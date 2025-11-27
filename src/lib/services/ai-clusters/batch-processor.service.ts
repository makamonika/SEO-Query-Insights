import type { Tables } from "@/db/database.types";
import { OpenRouterService, OpenRouterError } from "../openrouter.service";
import type { JsonSchemaConfig } from "../openrouter.types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-builder";

/**
 * Batch Processor Service
 * Handles batch processing of queries through AI clustering
 */

// JSON Schema for OpenRouter response format
const CLUSTER_RESPONSE_SCHEMA: JsonSchemaConfig = {
  type: "json_schema",
  json_schema: {
    name: "cluster_suggestions",
    schema: {
      type: "object",
      properties: {
        clusters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              queryIds: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["name", "queryIds"],
            additionalProperties: false,
          },
        },
      },
      required: ["clusters"],
      additionalProperties: false,
    },
    strict: true,
  },
};

export interface ClusterResponse {
  clusters: {
    name: string;
    queryIds: string[];
  }[];
}

export const BatchProcessorService = {
  /**
   * Process multiple batches of queries through AI clustering
   */
  async processBatches(batches: Tables<"queries">[][], openRouter: OpenRouterService): Promise<ClusterResponse[]> {
    const batchResults: ClusterResponse[] = [];
    const systemPrompt = buildSystemPrompt();

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        const result = await this.processSingleBatch(batch, openRouter, systemPrompt);
        batchResults.push(result);
      } catch (error) {
        if (error instanceof OpenRouterError) {
          console.error(`OpenRouter error for batch ${batchIndex + 1}:`, {
            code: error.code,
            message: error.message,
            userMessage: error.userMessage,
            statusCode: error.statusCode,
            retryable: error.retryable,
          });
          // Preserve OpenRouterError with context
          throw new OpenRouterError(
            `AI clustering failed for batch ${batchIndex + 1}: ${error.userMessage}`,
            error.code,
            error.statusCode,
            error.retryable
          );
        }
        throw error;
      }
    }

    return batchResults;
  },

  /**
   * Process a single batch of queries
   */
  async processSingleBatch(
    batch: Tables<"queries">[],
    openRouter: OpenRouterService,
    systemPrompt: string
  ): Promise<ClusterResponse> {
    const userPrompt = buildUserPrompt(batch);

    const response = await openRouter.chat({
      systemPrompt,
      userPrompt,
      responseFormat: CLUSTER_RESPONSE_SCHEMA,
      parameters: {
        temperature: 0.7,
      },
    });

    // Parse the AI response
    try {
      const aiResponse: ClusterResponse = JSON.parse(response.message.content);
      return aiResponse;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Invalid JSON response from AI");
    }
  },

  /**
   * Split queries into batches
   */
  createBatches(queries: Tables<"queries">[], batchSize = 1000): Tables<"queries">[][] {
    const batches: Tables<"queries">[][] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      batches.push(queries.slice(i, i + batchSize));
    }

    return batches;
  },
};
