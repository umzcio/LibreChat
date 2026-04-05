import React, { useEffect, useCallback, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { visit } from 'unist-util-visit';
import { useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import type { Pluggable } from 'unified';
import type { Artifact } from '~/common';
import { useMessageContext } from '~/Providers';
import { logger, extractContent, isArtifactRoute } from '~/utils';
import { artifactsState } from '~/store/artifacts';
import ArtifactButton from './ArtifactButton';

interface AstNode {
  type: string;
  name?: string;
  value?: string;
  children?: AstNode[];
  attributes?: Record<string, string>;
  data?: Record<string, unknown>;
}

const blockTypes = new Set(['paragraph', 'html', 'heading', 'blockquote', 'code', 'thematicBreak']);

function extractRawText(nodes: AstNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (typeof node.value === 'string') {
      parts.push(node.value);
    } else if (Array.isArray(node.children)) {
      parts.push(extractRawText(node.children));
    }
    if (blockTypes.has(node.type) && parts.length > 0) {
      parts.push('\n');
    }
  }
  return parts.join('');
}

export const artifactPlugin: Pluggable = () => {
  return (tree) => {
    let artifactCounter = 0;
    visit(tree, ['textDirective', 'leafDirective', 'containerDirective'], (node, index, parent) => {
      if (node.type === 'textDirective') {
        const replacementText = `:${node.name}`;
        if (parent && Array.isArray(parent.children) && typeof index === 'number') {
          parent.children[index] = {
            type: 'text',
            value: replacementText,
          };
        }
      }
      if (node.name === 'artifact-update') {
        const rawContent = Array.isArray(node.children)
          ? extractRawText(node.children as AstNode[])
          : '';
        node.data = {
          hName: 'artifact-update',
          hProperties: {
            ...node.attributes,
            rawContent,
          },
          ...node.data,
        };
        node.children = [];
        return node;
      }
      if (node.name !== 'artifact') {
        return;
      }
      if (Array.isArray(node.children)) {
        node.children = node.children.filter(
          (child: { type: string }) => child.type === 'code',
        );
      }
      const stableIndex = artifactCounter++;
      node.data = {
        hName: node.name,
        hProperties: { ...node.attributes, stableIndex: String(stableIndex) },
        ...node.data,
      };
      return node;
    });
  };
};

const defaultTitle = 'untitled';
const defaultType = 'unknown';
const defaultIdentifier = 'lc-no-identifier';

export function Artifact({
  node: _node,
  ...props
}: Artifact & {
  stableIndex?: string;
  children: React.ReactNode | { props: { children: React.ReactNode } };
  node: unknown;
}) {
  const location = useLocation();
  const { messageId } = useMessageContext();
  const artifactIndex = props.stableIndex != null ? parseInt(props.stableIndex, 10) : 0;

  const setArtifacts = useSetAtom(artifactsState);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  const throttledUpdateRef = useRef(
    throttle((updateFn: () => void) => {
      updateFn();
    }, 25),
  );

  const updateArtifact = useCallback(() => {
    const content = extractContent(props.children);
    logger.log('artifacts', 'updateArtifact: content.length', content.length);

    const title = props.title ?? defaultTitle;
    const type = props.type ?? defaultType;
    const identifier = props.identifier ?? defaultIdentifier;
    const artifactKey = `${identifier}_${type}_${title}_${messageId}_${artifactIndex}`
      .replace(/\s+/g, '_')
      .toLowerCase();

    throttledUpdateRef.current(() => {
      const now = Date.now();
      if (artifactKey === `${defaultIdentifier}_${defaultType}_${defaultTitle}_${messageId}_${artifactIndex}`) {
        return;
      }

      const currentArtifact: Artifact = {
        id: artifactKey,
        identifier,
        title,
        type,
        content,
        messageId,
        index: artifactIndex,
        lastUpdateTime: now,
      };

      if (!isArtifactRoute(location.pathname)) {
        return setArtifact(currentArtifact);
      }

      setArtifacts((prevArtifacts) => {
        if (
          prevArtifacts?.[artifactKey] != null &&
          prevArtifacts[artifactKey]?.content === content
        ) {
          return prevArtifacts;
        }

        return {
          ...prevArtifacts,
          [artifactKey]: currentArtifact,
        };
      });

      setArtifact(currentArtifact);
    });
  }, [
    props.type,
    props.title,
    setArtifacts,
    props.children,
    props.identifier,
    messageId,
    artifactIndex,
    location.pathname,
  ]);

  useEffect(() => () => throttledUpdateRef.current.cancel(), []);

  useEffect(() => {
    updateArtifact();
  }, [updateArtifact]);

  return <ArtifactButton artifact={artifact} />;
}
