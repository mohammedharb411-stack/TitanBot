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
      logger.warn(`تم استدعاء logTicketEvent بدون خادم GUID صالح: ${guildId}`);
      return;
    }

    const config = await getGuildConfig(client, guildId);

    const logChannelId = getLogChannelForEventType(config, event.type);
    if (!logChannelId) {
      return;
    }

    const channel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);
    if (!channel) {
      logger.warn(`لم يتم العثور على قناة سجل التكت: ${logChannelId} لنوع الحدث: ${event.type}`);
      return;
    }

    const permissions = channel.permissionsFor(guild.members.me);
    if (!permissions.has(['إرسال الرسائل', 'روابط التضمين'])) {
      logger.warn(`الأذونات المفقودة في قناة سجل التكت: ${logChannelId}`);
      return;
    }

    const embed = await createTicketLogEmbed(guild, event);

    const messageOptions = { embeds: [embed] };

    if (event.attachments && event.attachments.length > 0) {
      messageOptions.files = event.attachments;
    }

    await channel.send(messageOptions);
    logger.info(`تم تسجيل حدث التكت: ${event.type} في النقابة ${guildId}`);
  } catch (error) {
    logger.error('حدث خطأ في تسجيل التكت:', error);
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
      type: 'تعليق',
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
    case 'نص':
      return config.ticketTranscriptChannelId || null;

    case 'يفتح':
    case 'يغلق':
    case 'يمسح':
    case 'مطالبة':
    case 'عدم المطالبة':
    case 'أولوية':
    case 'التثبيت':
    case 'إلغاء التثبيت':
    case 'تعليق':
      return config.ticketLogsChannelId || null;

    default:
      return null;
  }
}

const TICKET_EVENT_STYLES = {
  open: { color: 0x5865F2, title: 'تم إنشاء التكت' },
  close: { color: 0xED4245, title: 'تم إغلاق التكت' },
  delete: { color: 0x8b0000, title: 'تم حذف التكت' },
  claim: { color: 0x5865F2, title: 'تم استلام التكت' },
  unclaim: { color: 0xFAA61A, title: 'تكت غير مُستلمة' },
  priority: { color: 0x9b59b6, title: 'تم تحديث الأولوية' },
  transcript: { color: 0x57F287, title: 'تم إنشاء النص' },
  feedback: { color: 0x57F287, title: 'التعليقات الواردة' },
};

async function createTicketLogEmbed(guild, event) {
  const style = TICKET_EVENT_STYLES[event.type] || { color: 0x95a5a6, title: 'تكت' };
  const ticketNumber = event.ticketNumber || event.ticketId;
  const ticketRef = ticketNumber ? `#${ticketNumber}` : 'مجهول';
  const channelMention = event.ticketId ? `<#${event.ticketId}>` : null;
  const executorMention = event.executorId ? `<@${event.executorId}>` : null;
  const userMention = event.userId ? `<@${event.userId}>` : null;

  let inlineFields = [];
  let fields = [];
  let author = null;
  let footer = { text: 'نظام تكت TitanBot' };

  switch (event.type) {
    case 'open':
      author = await resolveUserAuthor(guild.client, event.userId);
      inlineFields = [
        { name: 'تكت', value: ticketRef, inline: true },
        { name: 'المنشئ', value: userMention || 'مجهول', inline: true },
      ];
      if (channelMention) {
        inlineFields.push({ name: 'قناة', value: channelMention, inline: true });
      }
      if (event.reason) {
        fields.push({ name: 'سبب', value: String(event.reason).slice(0, 1024), inline: false });
      }
      break;

    case 'close':
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'تكت', value: ticketRef, inline: true },
        { name: 'مغلق بواسطة', value: executorMention || 'مجهول', inline: true },
      ];
      if (channelMention) {
        inlineFields.push({ name: 'قناة', value: channelMention, inline: true });
      }
      if (event.reason) {
        fields.push({ name: 'سبب', value: String(event.reason).slice(0, 1024), inline: false });
      }
      break;

    case 'delete':
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'تكت', value: ticketRef, inline: true },
        { name: 'تم الحذف بواسطة', value: executorMention || 'مجهول', inline: true },
      ];
      break;

    case 'claim':
    case 'unclaim':
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'تكت', value: ticketRef, inline: true },
        {
          name: event.type === 'مطالبة' ? 'تمت المطالبة به بواسطة' : 'غير مطالب به من قبل',
          value: executorMention || 'مجهول',
          inline: true,
        },
      ];
      break;

    case 'priority': {
      const priorityEmojis = { none: '⚪', low: '🔵', medium: '🟢', high: '🟡', urgent: '🔴' };
      const priorityLabel = event.priority
        ? `${priorityEmojis[event.priority] || '⚪'} ${event.priority.charAt(0).toUpperCase()}${event.priority.slice(1)}`
        : 'مجهول';
      author = await resolveUserAuthor(guild.client, event.executorId);
      inlineFields = [
        { name: 'تكت', value: ticketRef, inline: true },
        { name: 'أولوية', value: priorityLabel, inline: true },
        { name: 'تم التحديث بواسطة', value: executorMention || 'مجهول', inline: true },
      ];
      break;
    }

    case 'transcript':
      inlineFields = [
        { name: 'Ticket', value: ticketRef, inline: true },
        { name: 'Creator', value: userMention || 'Unknown', inline: true },
      ];
      if (event.metadata?.messageCount) {
        inlineFields.push({ name: 'Messages', value: String(event.metadata.messageCount), inline: true });
      }
      if (event.metadata?.duration) {
        fields.push({ name: 'Duration', value: String(event.metadata.duration), inline: false });
      }
      if (event.metadata?.subject || event.reason) {
        fields.push({
          name: 'Subject',
          value: String(event.metadata?.subject || event.reason).slice(0, 1024),
          inline: false,
        });
      }
      break;

    case 'feedback': {
      const rating = event.metadata?.rating ?? event.rating;
      const comment = event.metadata?.comment;
      const ratingDisplay = formatRatingStars(rating) || 'No rating';

      author = await resolveUserAuthor(guild.client, event.userId);
      inlineFields = [
        { name: 'Ticket', value: ticketRef, inline: true },
        { name: 'Rating', value: ratingDisplay, inline: true },
      ];

      if (comment) {
        fields.push({
          name: 'Comment',
          value: String(comment).slice(0, 1024),
          inline: false,
        });
      }
      break;
    }

    default:
      inlineFields = [
        { name: 'Ticket', value: ticketRef, inline: true },
      ];
      if (event.reason) {
        fields.push({ name: 'Details', value: String(event.reason).slice(0, 1024), inline: false });
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
      error: 'Channel must be a text channel.',
    };
  }

  const permissions = channel.permissionsFor(botMember);
  const requiredPermissions = ['SendMessages', 'EmbedLinks'];

  const missing = requiredPermissions.filter((perm) => !permissions.has(perm));

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing permissions: ${missing.join(', ')}`,
    };
  }

  return { valid: true };
}

