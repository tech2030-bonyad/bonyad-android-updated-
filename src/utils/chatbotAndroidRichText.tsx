import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import type { NavigationAction } from './navigationParser';
import {
  CHATBOT_PROFILE_SECTION_ALIASES,
  CHATBOT_PROJECT_PHASE_ALIASES,
  CHATBOT_SMALL_TASK_LIST_ALIASES,
} from './navigationParser';

function normalizeChatMarkdownForInline(raw: string): string {
  if (!raw) return raw;
  let s = raw.replace(/`([^`\n]+)`/g, '$1');
  s = s.replace(/`/g, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Strip ASCII / typographic quotes models sometimes wrap link labels with. */
function stripLinkQuotes(text: string): string {
  return text
    .replace(/^[\s'"''\u2018\u2019\u201c\u201d]+/g, '')
    .replace(/[\s'"''\u2018\u2019\u201c\u201d]+$/g, '')
    .trim();
}

function normalizeNavLabelForScore(label: string): string {
  return label
    .replace(/^go to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Prefer the right screen when several [NAV:] actions share similar labels (same as web ChatBotScreen). */
function scoreNavActionForBold(boldLower: string, action: NavigationAction): number {
  const rawLabel = (action.label || '').trim();
  const label = normalizeNavLabelForScore(rawLabel);
  const target = String(action.target || '').toLowerCase();
  const params = (action.params || {}) as Record<string, string>;
  const mode = String(params.mode || params.entry || '').toLowerCase();

  let s = 0;
  if (boldLower === label || boldLower === rawLabel.toLowerCase()) s += 500;
  if (boldLower === target) s += 400;

  const isGenericNew =
    boldLower === 'new project' ||
    boldLower === 'create project' ||
    boldLower === 'newproject';
  const isManualPhrase =
    boldLower === 'manual entry' ||
    boldLower === 'manual' ||
    (boldLower.includes('manual') && boldLower.includes('entry'));
  const isAiPhrase =
    boldLower === 'ai form' ||
    boldLower === 'aiform' ||
    boldLower === 'ai' ||
    /^ai\s+/i.test(boldLower) ||
    boldLower.startsWith('ai-') ||
    boldLower.includes('ai-assisted') ||
    boldLower.includes('ai assisted') ||
    (boldLower.includes('ai') && boldLower.includes('creation'));

  const tNorm = target.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (tNorm === 'changephone') {
    if (
      boldLower.includes('phone') ||
      boldLower.includes('number') ||
      (boldLower.includes('change') && boldLower.includes('phone'))
    ) {
      s += 520;
    }
  }
  if (tNorm === 'changepassword' && boldLower.includes('password')) {
    s += 520;
  }

  if (tNorm === 'newproject' || tNorm === 'newprojectmanual') {
    if (isGenericNew && !isManualPhrase && !isAiPhrase) {
      if (!mode) s += 350;
      if (mode === 'manual') s -= 280;
    }
    if (isManualPhrase && mode === 'manual') s += 400;
    if (
      isManualPhrase &&
      !mode &&
      (label.includes('manual') || rawLabel.toLowerCase().includes('manual'))
    ) {
      s += 320;
    }
  }
  if (tNorm === 'aiform') {
    if (isAiPhrase) s += 420;
    if (isGenericNew && !isAiPhrase) s -= 200;
  }
  if (tNorm === 'manualform') {
    if (isManualPhrase) s += 450;
    if (isAiPhrase) s -= 250;
  }

  if (target === 'profile') {
    const sec = params.section;
    if (
      sec === 'changePhone' &&
      (boldLower.includes('phone') ||
        boldLower.includes('number') ||
        (boldLower.includes('change') && boldLower.includes('phone')))
    ) {
      s += 480;
    }
    if (sec === 'changePassword' && boldLower.includes('password')) s += 450;
    if (
      sec === 'editProfile' &&
      (boldLower.includes('edit') ||
        boldLower.includes('profile info') ||
        boldLower.includes('information'))
    ) {
      s += 450;
    }
    if (!sec && (boldLower === 'profile' || boldLower === 'my profile')) s += 380;
    if (sec && boldLower === 'profile') s -= 120;
    if (
      sec === 'transactions' &&
      (boldLower.includes('transaction') ||
        boldLower.includes('payment') ||
        boldLower.includes('history') ||
        boldLower.includes('payments'))
    ) {
      s += 500;
    }
    if (sec === 'subscription' && (boldLower.includes('subscription') || boldLower.includes('billing')))
      s += 460;
    if (sec === 'services' && boldLower.includes('service')) s += 460;
    if (sec === 'regions' && (boldLower.includes('region') || boldLower.includes('area'))) s += 460;
    if (sec === 'availability' && boldLower.includes('availability')) s += 460;
    if (sec === 'smallTasks' && (boldLower.includes('task') || boldLower.includes('special'))) s += 450;
    if (sec === 'portfolio' && boldLower.includes('portfolio')) s += 460;
    if (sec === 'support' && boldLower.includes('support')) s += 460;
  }

  const mentionsSmallTask =
    boldLower.includes('small task') ||
    boldLower.includes('small tasks') ||
    boldLower.includes('quick task');
  if (target === 'projects') {
    const af = String(params.activeFilter ?? params.tab ?? '')
      .toLowerCase()
      .replace(/_/g, '-');
    const isSmall = String(params.projectTypeFilter ?? '').toLowerCase() === 'small';
    const techAvail = String(params.chatbotUxTab ?? '') === 'technician-available';
    if (
      techAvail &&
      (boldLower === 'available' || boldLower.includes('available') || boldLower.includes('submit bid'))
    ) {
      s += 620;
    }
    if (boldLower === 'pending' && af === 'pending') {
      if (isSmall) s += 550;
      else s += 800;
    }
    if (mentionsSmallTask) {
      if (isSmall) s += 650;
      else s -= 900;
    }
    if (!af) {
      if (boldLower === 'projects' || boldLower === 'my projects') s += 360;
    } else {
      const aliasTable = isSmall ? CHATBOT_SMALL_TASK_LIST_ALIASES : CHATBOT_PROJECT_PHASE_ALIASES;
      const aliases = aliasTable[af];
      if (
        aliases?.some(
          (ph) =>
            boldLower === ph ||
            (ph.length >= 5 && boldLower.includes(ph)) ||
            boldLower.includes(ph)
        )
      ) {
        s += 470;
      }
      if (isSmall && boldLower.includes('small')) s += 120;
      if (af === 'pending' && (boldLower.includes('pending') || boldLower.includes('await'))) s += 440;
      if (af === 'bidding' && (boldLower.includes('bid') || boldLower.includes('bidding'))) s += 440;
      if (af === 'contract' && (boldLower.includes('contract') || boldLower.includes('sign'))) s += 440;
      if (
        af === 'in-progress' &&
        (boldLower.includes('progress') ||
          boldLower.includes('running') ||
          boldLower.includes('ongoing'))
      ) {
        s += 440;
      }
      if (
        af === 'completed' &&
        (boldLower.includes('completed') || boldLower.includes('done') || boldLower.includes('finished'))
      ) {
        s += 440;
      }
      if (af === 'approved' && boldLower.includes('approved')) s += 440;
      if (af === 'direct-assigned' && boldLower.includes('direct')) s += 440;
    }
  }

  s += Math.min(120, (rawLabel || '').length);
  return s;
}

function boldTextMatchesNavAction(boldLower: string, action: NavigationAction): boolean {
  const label = stripLinkQuotes(String(action.label || '')).toLowerCase().trim();
  const target = (action.target || '').toLowerCase().trim();
  if (!label && !target) return false;
  const mentionsSmallTask =
    boldLower.includes('small task') ||
    boldLower.includes('small tasks') ||
    boldLower.includes('quick task');
  if (mentionsSmallTask && action.target === 'projects') {
    const prm = action.params as Record<string, string> | undefined;
    if (String(prm?.projectTypeFilter ?? '').toLowerCase() !== 'small') {
      return false;
    }
  }
  if (boldLower === label || boldLower === target || stripLinkQuotes(boldLower) === label) return true;
  if (action.target === 'profile' && action.params && typeof (action.params as Record<string, string>).section === 'string') {
    const sec = String((action.params as Record<string, string>).section);
    const aliases = CHATBOT_PROFILE_SECTION_ALIASES[sec];
    if (aliases?.length) {
      for (const phrase of aliases) {
        const al = phrase.toLowerCase();
        if (boldLower === al) return true;
        if (al.length >= 6 && boldLower.includes(al)) return true;
        if (boldLower.length >= 6 && al.includes(boldLower)) return true;
      }
    }
  }
  if (action.target === 'projects' && action.params && typeof (action.params as Record<string, string>).activeFilter === 'string') {
    const prm = action.params as Record<string, string>;
    const af = String(prm.activeFilter)
      .toLowerCase()
      .replace(/_/g, '-');
    const isSmall = String(prm.projectTypeFilter ?? '').toLowerCase() === 'small';
    const aliases = isSmall ? CHATBOT_SMALL_TASK_LIST_ALIASES[af] : CHATBOT_PROJECT_PHASE_ALIASES[af];
    if (aliases?.length) {
      for (const phrase of aliases) {
        const al = phrase.toLowerCase();
        if (boldLower === al) return true;
        if (al.length >= 5 && boldLower.includes(al)) return true;
        if (boldLower.length >= 5 && al.includes(boldLower)) return true;
      }
    }
  }
  if (label && label.includes(boldLower)) return true;
  if (label && boldLower.includes(label)) {
    const wordCount = label.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 2) return true;
    if (label.length >= 12) return true;
    return boldLower === label;
  }
  const tCompact = target.replace(/[^a-z0-9]/g, '');
  const bCompact = boldLower.replace(/[^a-z0-9]/g, '');
  if (tCompact.length >= 4 && bCompact.length >= 4 && bCompact === tCompact) {
    return true;
  }
  return false;
}

export function renderChatbotInlineText(
  rawText: string,
  navigationActions: NavigationAction[] | undefined,
  baseStyle: TextStyle | TextStyle[],
  linkStyle: TextStyle,
  onPressNav: (action: NavigationAction) => void
): React.ReactNode {
  const base = StyleSheet.flatten(baseStyle);
  const sourceText = normalizeChatMarkdownForInline(rawText);
  const boldPattern = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = boldPattern.exec(sourceText)) !== null) {
    const matchStart = match.index;
    if (matchStart > lastIndex) {
      const plain = sourceText
        .substring(lastIndex, matchStart)
        .replace(/\*\*/g, '');
      parts.push(
        <Text key={`t-${key++}`} style={base}>
          {plain}
        </Text>
      );
    }
    const boldRaw = match[1];
    const boldText = stripLinkQuotes(boldRaw);
    const boldLower = boldText.toLowerCase().trim();
    let matchingAction: NavigationAction | undefined;
    if (navigationActions?.length) {
      const candidates = navigationActions.filter((a) =>
        boldTextMatchesNavAction(boldLower, a)
      );
      if (candidates.length > 0) {
        matchingAction = [...candidates].sort(
          (a, b) => scoreNavActionForBold(boldLower, b) - scoreNavActionForBold(boldLower, a)
        )[0];
      }
    }
    if (matchingAction) {
      parts.push(
        <Text
          key={`b-${key++}`}
          style={[base, linkStyle]}
          onPress={() => onPressNav(matchingAction!)}
          suppressHighlighting={false}
        >
          {boldText}
        </Text>
      );
    } else {
      parts.push(
        <Text key={`b-${key++}`} style={base}>
          {boldText}
        </Text>
      );
    }
    lastIndex = boldPattern.lastIndex;
  }
  if (lastIndex < sourceText.length) {
    const tail = sourceText.substring(lastIndex).replace(/\*\*/g, '');
    parts.push(
      <Text key={`t-${key++}`} style={base}>
        {tail}
      </Text>
    );
  }
  return (
    <Text style={base}>
      {parts.length > 0 ? parts : sourceText}
    </Text>
  );
}
