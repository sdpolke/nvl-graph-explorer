/**
 * Entity Mention Parser
 * 
 * Detects entity names in response text and converts them to clickable markdown links.
 * Handles overlapping mentions by processing in reverse order.
 */

import type { EntityMention } from '../components/chat/types';

/**
 * Parse entity mentions in text and convert to clickable markdown links
 * 
 * @param content - The text content to parse
 * @param entities - Array of entity mentions with positions
 * @returns Markdown-formatted text with entity links
 */
export function parseEntityMentions(
  content: string,
  entities?: EntityMention[]
): string {
  if (!entities || entities.length === 0) {
    return content;
  }

  // Sort entities by start index (descending) to avoid index shifting
  const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);

  let result = content;

  sortedEntities.forEach(entity => {
    const before = result.substring(0, entity.startIndex);
    const entityText = result.substring(entity.startIndex, entity.endIndex);
    const after = result.substring(entity.endIndex);

    // Create clickable markdown link
    const link = `[**${entityText}**](#entity-${entity.nodeId})`;

    result = before + link + after;
  });

  return result;
}

/**
 * Detect entity names in text and create EntityMention objects
 * 
 * @param content - The text content to search
 * @param entityNames - Map of entity names to their metadata (type, nodeId)
 * @returns Array of EntityMention objects with positions
 */
export function detectEntityMentions(
  content: string,
  entityNames: Map<string, { type: string; nodeId: string }>
): EntityMention[] {
  const mentions: EntityMention[] = [];
  const processedRanges: Array<{ start: number; end: number }> = [];

  // Sort entity names by length (descending) to match longer names first
  const sortedNames = Array.from(entityNames.keys()).sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    const metadata = entityNames.get(name)!;
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      // Check if this range overlaps with any processed range
      const overlaps = processedRanges.some(
        range =>
          (startIndex >= range.start && startIndex < range.end) ||
          (endIndex > range.start && endIndex <= range.end) ||
          (startIndex <= range.start && endIndex >= range.end)
      );

      if (!overlaps) {
        mentions.push({
          text: match[0],
          type: metadata.type as any,
          nodeId: metadata.nodeId,
          startIndex,
          endIndex
        });

        processedRanges.push({ start: startIndex, end: endIndex });
      }
    }
  }

  // Sort by start index for consistent ordering
  return mentions.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
