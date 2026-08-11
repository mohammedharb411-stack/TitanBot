import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { formatWelcomeMessage, truncateForEmbedField } from '../../utils/welcome.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ErrorTypes, replyUserError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('تكوين نظام الترحيب')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('إعداد رسالة الترحيب')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('القناة التي سترسل إليها رسائل الترحيب')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('رسالة الترحيب. المتغيرات: {user}, {username}, {server}, {memberCount}')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('رابط الصورة المراد تضمينها في رسالة الترحيب')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('ping')
                        .setDescription('ما إذا كان سيتم منشن المستخدم في رسالة الترحيب')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            const deferSuccess = await InteractionHelper.safeDefer(interaction);
            if (!deferSuccess) {
                logger.warn(`فشل تأجيل تفاعل الترحيب`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'welcome'
                });
                return;
            }
        } catch (deferError) {
            logger.error(`خطأ في تأجيل الترحيب`, { error: deferError.message });
            return;
        }

        const { options, guild, client } = interaction;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'تحتاج إلى صلاحية **إدارة السيرفر** لاستخدام `/welcome`.' });
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = options.getChannel('channel');
            const message = options.getString('message');
            const image = options.getString('image');
            const ping = options.getBoolean('ping') ?? false;

            const existingConfig = await getWelcomeConfig(client, guild.id);
            if (existingConfig?.channelId) {
                logger.info(`[Welcome] تم حظر الإعداد لوجود تكوين مسبق في القناة ${existingConfig.channelId} للسيرفر ${guild.id}`);
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `تم تكوين الترحيب مسبقاً لـ <#${existingConfig.channelId}>. استخدم **/greet dashboard** لتخصيص القناة، الرسالة، المنشن، أو الصورة.` });
            }
            
            if (!message || message.trim().length === 0) {
                logger.warn(`[Welcome] رسالة فارغة أرسلها ${interaction.user.tag} في ${guild.name}`);
                return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'لا يمكن أن تكون رسالة الترحيب فارغة' });
            }

            if (image) {
                try {
                    new URL(image);
                } catch (e) {
                    logger.warn(`[Welcome] رابط صورة غير صالح أرسله ${interaction.user.tag}: ${image}`);
                    return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'يرجى إدخال رابط صورة صالح (يجب أن يبدأ بـ http:// أو https://)' });
                }
            }

            try {
                await updateWelcomeConfig(client, guild.id, {
                    enabled: true,
                    channelId: channel.id,
                    welcomeMessage: message,
                    welcomeImage: image || undefined,
                    welcomePing: ping
                });

                logger.info(`[Welcome] تم الإعداد بواسطة ${interaction.user.tag} للسيرفر ${guild.name} (${guild.id})`);

                const previewMessage = formatWelcomeMessage(message, {
                    user: interaction.user,
                    guild
                });

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('تم تكوين نظام الترحيب')
                    .setDescription(`سيتم إرسال رسائل الترحيب الآن إلى ${channel}`)
                    .addFields(
                        { name: 'معاينة الرسالة', value: truncateForEmbedField(previewMessage) },
                        { name: 'منشن المستخدم', value: ping ? 'نعم' : 'لا' },
                        { name: 'الحالة', value: 'مُفعّل' }
                    )
                    .setFooter({ text: 'نصيحة: استخدم /greet dashboard لتخصيص إعدادات الترحيب' });

                if (image) {
                    embed.setImage(image);
                }

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            } catch (error) {
                logger.error(`[Welcome] فشل في إعداد نظام الترحيب للسيرفر ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'حدث خطأ أثناء تكوين نظام الترحيب. يرجى المحاولة مرة أخرى.' });
            }
        }
    },
};
