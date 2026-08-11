import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { formatWelcomeMessage, truncateForEmbedField } from '../../utils/welcome.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ErrorTypes, replyUserError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('قم بتهيئة نظام رسائل الوداع')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('قم بإعداد رسالة الوداع')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('القناة التي سيتم إرسال رسائل الوداع إليها')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('رسالة الوداع. المتغيرات: {user}, {username}, {server}, {memberCount}')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('رابط الصورة المراد تضمينها في رسالة الوداع')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('ping')
                        .setDescription('ما إذا كان يجب عمل منشن للمستخدم في رسالة الوداع')
                        .setRequired(false))),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Goodbye interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'goodbye'
            });
            return;
        }

        const { options, guild, client } = interaction;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'أنت بحاجة إلى صلاحية **إدارة الخادم** لاستخدام أمر `/goodbye`.' });
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = options.getChannel('channel');
            const message = options.getString('message');
            const image = options.getString('image');
            const ping = options.getBoolean('ping') ?? false;

            const existingConfig = await getWelcomeConfig(client, guild.id);
            if (existingConfig?.goodbyeChannelId) {
                logger.info(`[Goodbye] Setup blocked because config already exists in channel ${existingConfig.goodbyeChannelId} for guild ${guild.id}`);
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `تم تكوين رسائل الوداع بالفعل في <#${existingConfig.goodbyeChannelId}>. استخدم **/greet dashboard** لتخصيص القناة، الرسالة، المنشن، أو الصورة.` });
            }

            if (!message || message.trim().length === 0) {
                logger.warn(`[Goodbye] Empty message provided by ${interaction.user.tag} in ${guild.name}`);
                return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'رسالة الوداع لا يمكن أن تكون فارغة' });
            }

            if (image) {
                try {
                    new URL(image);
                } catch (e) {
                    logger.warn(`[Goodbye] Invalid image URL provided by ${interaction.user.tag}: ${image}`);
                    return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'يرجى تقديم رابط صورة صالح (يجب أن يبدأ بـ http:// أو https://)' });
                }
            }

            try {
                await updateWelcomeConfig(client, guild.id, {
                    goodbyeEnabled: true,
                    goodbyeChannelId: channel.id,
                    leaveMessage: message,
                    goodbyePing: ping,
                    leaveEmbed: {
                        title: "وداعاً {user.tag}",
                        description: message,
                        color: getColor('error'),
                        footer: `وداعاً من ${guild.name}!`,
                        ...(image && { image: { url: image } })
                    }
                });

                logger.info(`[Goodbye] Setup configured by ${interaction.user.tag} for guild ${guild.name} (${guild.id})`);

                const previewMessage = formatWelcomeMessage(message, {
                    user: interaction.user,
                    guild
                });

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('تم تكوين نظام الوداع')
                    .setDescription(`سيتم الآن إرسال رسائل الوداع إلى ${channel}`)
                    .addFields(
                        { name: 'معاينة الرسالة', value: truncateForEmbedField(previewMessage) },
                        { name: 'منشن المستخدم', value: ping ? 'نعم' : 'لا' },
                        { name: 'الحالة', value: 'مُفعّل' }
                    )
                    .setFooter({ text: 'نصيحة: استخدم /greet dashboard لتخصيص إعدادات الوداع' });

                if (image) {
                    embed.setImage(image);
                }

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            } catch (error) {
                logger.error(`[Goodbye] Failed to setup goodbye system for guild ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'حدث خطأ أثناء تكوين نظام الوداع. يرجى المحاولة مرة أخرى.' });
            }
        }
    },
};
