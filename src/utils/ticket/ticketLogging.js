// ticketLogging.js

import { ChannelType } from 'discord.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { logger } from '../logger.js';
import {
  buildStandardLogEmbed,
  formatRatingStars,
  resolveUserAuthor,
} from '../logging/logEmbeds.js';

export async function logTicketEvent({ client, guildId, event }) {
  try {
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      logger.warn(`تم استدعاء logTicketEvent بدون سيرفر صالح: ${guildId}`);
      return;
    }

    const config = await getGuildConfig(client, guildId);

    const logChannelId = getLogChannelForEventType(config, event.type);
    if (!logChannelId) {
      return;
    }

    const channel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);
    if (!channel) {
      logger.warn(`قناة سجل التكت غير موجودة: ${logChannelId} لنوع الحدث: ${event.type}`);
      return;
    }

    const permissions = channel.permissionsFor(guild.members.me);
    if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
      logger.warn(`صلاحيات ناقصة في قناة سجل التكت: ${logChannelId}`);
      return;
    }

    const embed = await createTicketLogEmbed(guild, event);

    const messageOptions = { embeds: [embed] };

    if (event.attachments && event.attachments.length > 0) {
      messageOptions.files = event.attachments;
    }

    await channel.send(messageOptions);
    logger.info(`تم تسجيل حدث التذكرة: ${event.type} في السيرفر ${guildId}`);
  } catch (error) {
    logger.error('خطأ في تسجيل حدث التذكرة:', error);
  }
}

export async function logTicketFeedback({
  client,
  guildId,
  ticketNumber,
  ticketChannelId,
  userId,
  rating = null,
  comment = null,
}) {
  await logTicketEvent({
    client,
    guildId,
    event: {
      type: 'feedback',
      ticketId: ticketChannelId,
      ticketNumber,
      userId,
      metadata: {
        rating,
        comment,
      },
    },
  });
}

function getLogChannelForEventType(config, eventType) {
  switch (eventType) {
    case 'transcript':
      return config.ticketTranscriptChannelId || null;

    case 'open':
    case 'close':
    case 'delete':
    case 'claim':
    case 'unclaim':
    case 'priority':
    case 'pin':
    case 'unpin':
    case 'feedback':
      return config.ticketLogsChannelId || null;

    default:
      return null;
  }
}

const TICKET_EVENT_STYLES = {
  open: { color: 0x5865F2, title: 'تم إنشاء التذكرة' },
  close: { color: 0xED4245, title: 'تم إغلاق التذكرة' },
  delete: { color: 0x8b0000, title: 'تم حذف التذكرة' },
  claim: { color: 0x5865F2, title: 'تم استلام التذكرة' },
  unclaim: { color: 0xFAA61A, title: 'تم إلغاء استلام التذكرة' },
  priority: { color: 0x9b59b6, title: 'تم تحديث الأولوية' },
  transcript: { color: 0x57F287, title: 'تم إنشاء النسخة' },
  feedback: { color: 0x57F287, title: 'تم استلام التقييم' },
};

async function createTicketLogEmbed(guild, event) {
  const style = TICKET_EVENT_STYLES[event.type] || { color: 0x95a5a6, title: 'حدث التذكرة' };
  const ticketNumber = event.ticketNumber || event.ticketId;
  const ticketRef = ticketNumber ? `#${ticketNumber}` : 'غير معروف';
  const channelMention = event.ticketId ? `<#${event.ticketId}>` : null;
  const executorMention = event.executorId ? `<@${event.executorId}>` : null;
  const userMention = event.userId ? `<@${event.userId}>` : null;

  let inlineFields = [];
  let fields = [];
  let author = null;
  let footer = { text: 'نظام تذاكر TitanBot' };

  switch (event.type) {
    case 'open':
      author = await resolveUserAuthor(guild.client, event.userId);
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        { name: 'المنشئ', value: userMention || 'غير معروف', inline: true },
      ];
      if (channelMention) {
        inlineFields.push({ name: 'القناة', value: channelMention, inline: true });
      }
      if (event.reason) {
        fields.push({ name: 'السبب', value: String(event.reason).slice(0, 1024), inline: false });
      }
      break;

    case 'close':
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        { name: 'أغلقها', value: executorMention || 'غير معروف', inline: true },
      ];
      if (channelMention) {
        inlineFields.push({ name: 'القناة', value: channelMention, inline: true });
      }
      if (event.reason) {
        fields.push({ name: 'السبب', value: String(event.reason).slice(0, 1024), inline: false });
      }
      break;

    case 'delete':
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        { name: 'حذفها', value: executorMention || 'غير معروف', inline: true },
      ];
      break;

    case 'claim':
    case 'unclaim':
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        {
          name: event.type === 'claim' ? 'استلمها' : 'ألغى استلامها',
          value: executorMention || 'غير معروف',
          inline: true,
        },
      ];
      break;

    case 'priority': {
      const priorityEmojis = { none: '⚪', low: '🔵', medium: '🟢', high: '🟡', urgent: '🔴' };
      const priorityLabel = event.priority
        ? `${priorityEmojis[event.priority] || '⚪'} ${event.priority.charAt(0).toUpperCase()}${event.priority.slice(1)}`
        : 'غير معروف';
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        { name: 'الأولوية', value: priorityLabel, inline: true },
        { name: 'حدّثها', value: executorMention || 'غير معروف', inline: true },
      ];
      break;
    }

    case 'transcript':
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        { name: 'المنشئ', value: userMention || 'غير معروف', inline: true },
      ];
      if (event.metadata?.messageCount) {
        inlineFields.push({ name: 'الرسائل', value: String(event.metadata.messageCount), inline: true });
      }
      if (event.metadata?.duration) {
        fields.push({ name: 'المدة', value: String(event.metadata.duration), inline: false });
      }
      if (event.metadata?.subject || event.reason) {
        fields.push({
          name: 'الموضوع',
          value: String(event.metadata?.subject || event.reason).slice(0, 1024),
          inline: false,
        });
      }
      break;

    case 'feedback': {
      const rating = event.metadata?.rating ?? event.rating;
      const comment = event.metadata?.comment;
      const ratingDisplay = formatRatingStars(rating) || 'بدون تقييم';

      author = await resolveUserAuthor(guild.client, event.userId);
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
        { name: 'التقييم', value: ratingDisplay, inline: true },
      ];

      if (comment) {
        fields.push({
          name: 'التعليق',
          value: String(comment).slice(0, 1024),
          inline: false,
        });
      }
      break;
    }

    default:
      inlineFields = [
        { name: 'التذكرة', value: ticketRef, inline: true },
      ];
      if (event.reason) {
        fields.push({ name: 'التفاصيل', value: String(event.reason).slice(0, 1024), inline: false });
      }
  }

  const titlePrefix = event.type === 'feedback' ? '⭐ ' : '';
  return buildStandardLogEmbed({
    color: style.color,
    title: `${titlePrefix}${style.title}`,
    inlineFields,
    fields,
    author,
    footer,
  });
}

export async function getTicketLoggingConfig(client, guildId) {
  const config = await getGuildConfig(client, guildId);
  return {
    enabled: !!(config.ticketLogsChannelId || config.ticketTranscriptChannelId),
    lifecycleChannelId: config.ticketLogsChannelId || null,
    transcriptChannelId: config.ticketTranscriptChannelId || null,
  };
}

export function validateLogChannel(channel, botMember) {
  if (!channel || channel.type !== ChannelType.GuildText) {
    return {
      valid: false,
      error: 'يجب أن تكون القناة قناة نصية.',
    };
  }

  const permissions = channel.permissionsFor(botMember);
  const requiredPermissions = ['SendMessages', 'EmbedLinks'];

  const missing = requiredPermissions.filter((perm) => !permissions.has(perm));

  if (missing.length > 0) {
    return {
      valid: false,
      error: `صلاحيات ناقصة: ${missing.join(', ')}`,
    };
  }

  return { valid: true };
}
