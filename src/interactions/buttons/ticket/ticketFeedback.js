import { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getTicketData, saveTicketData } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';
import { getColor } from '../../../config/bot.js';
import { logTicketFeedback } from '../../../utils/ticket/ticketLogging.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';

const STAR_LABELS = {
    '1': '⭐ 1 — فقير',
    '2': '⭐ 2 — أقل من المتوسط',
    '3': '⭐ 3 — المتوسط',
    '4': '⭐ 4 — جيد',
    '5': '⭐ 5 — ممتاز',
};

const feedbackHandler = {
    name: 'ticket_feedback',

    async execute(interaction, client, args) {
        
        const [guildId, channelId, ratingStr] = args;

        if (!guildId || !channelId || !ratingStr) {
            await InteractionHelper.safeReply(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚠️ رابط التعليقات غير صالح')
                        .setDescription('يبدو أن رابط التعليقات هذا معطوب.')
                        .setColor(getColor('error')),
                ],
                components: [],
            });
            return;
        }

        try {
            await interaction.deferUpdate();
        } catch (err) {
            logger.warn('ملاحظات التكت: انتهت صلاحية التفاعل قبل تأجيل التحديث', { guildId, channelId, error: err.message });
            return;
        }

        let ticketData;
        try {
            ticketData = await getTicketData(guildId, channelId);
        } catch (err) {
            logger.warn('ملاحظات التكت: فشل تحميل بيانات التكت', { guildId, channelId, error: err.message });
        }

        if (!ticketData) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚠️ لم يتم العثور على التكت')
                        .setDescription('لم يتم العثور على التكت المرتبطة بهذا الاستطلاع.')
                        .setColor(getColor('error')),
                ],
                components: [],
            });
            return;
        }

        if (interaction.user.id !== ticketData.userId) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ غير مسموح')
                        .setDescription('لا يمكن إلا لمنشئ التكت تقديم ملاحظات بشأن هذه التكت.')
                        .setColor(getColor('error')),
                ],
                components: [],
            });
            return;
        }

        if (ticketData.feedback?.rating) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ تم الإرسال مسبقاً')
                        .setDescription(`لقد قمت بتقييم هذه التكت بالفعل **${STAR_LABELS[String(ticketData.feedback.rating)]}**.\nشكراً لك على ملاحظاتك!`)
                        .setColor(getColor('success')),
                ],
                components: [],
            });
            return;
        }

        const rating = parseInt(ratingStr, 10);
        const ratingLabel = STAR_LABELS[String(rating)] ?? `${rating} stars`;

        try {
            ticketData.feedback = {
                rating,
                submittedAt: new Date().toISOString(),
            };
            await saveTicketData(guildId, channelId, ticketData);
        } catch (err) {
            logger.error('ملاحظات التكت: فشل حفظ الملاحظات', { guildId, channelId, rating, error: err.message });
        }

        try {
            await logTicketFeedback({
                client: interaction.client,
                guildId,
                ticketNumber: ticketData.id,
                ticketChannelId: channelId,
                userId: interaction.user.id,
                rating,
            });
        } catch (err) {
            logger.warn('ملاحظات التكت: فشل إرسال السجل', { guildId, channelId, error: err.message });
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ شكراً لتعليقاتكم!')
                    .setDescription(`لقد قيّمت تجربة الدعم الخاصة بك **${ratingLabel}**.\n\nتم تسجيل ملاحظاتكم، وهي تساعدنا على التحسين!`)
                    .setColor(getColor('success'))
                    .setFooter({ text: 'نشكرك على استخدام نظام الدعم الخاص بنا.' })
                    .setTimestamp(),
            ],
            components: [],
        });

        logger.info('تم إرسال ملاحظات التكت', {
            guildId,
            channelId,
            userId: interaction.user.id,
            rating,
        });
    },
};

const commentHandler = {
    name: 'ticket_feedback_comment',

    async execute(interaction, client, args) {
        const [guildId, channelId] = args;

        if (!guildId || !channelId) {
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚠️ رابط التعليقات غير صالح')
                        .setDescription('يبدو أن إجراء التغذية الراجعة هذا معيب.')
                        .setColor(getColor('error')),
                ],
                components: [],
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`ticket_feedback_comment_modal:${guildId}:${channelId}`)
            .setTitle('إضافة تعليق على التكت');

        const commentInput = new TextInputBuilder()
            .setCustomId('feedback_comment')
            .setLabel('ملاحظاتكم')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('شاركنا ما سار على ما يرام أو كيف يمكننا التحسين...')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(commentInput));

        await interaction.showModal(modal);
    },
};

const declineHandler = {
    name: 'ticket_feedback_decline',

    async execute(interaction) {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('👋 لا مشكلة!')
                    .setDescription('يمكنك دائمًا التواصل معنا مرة أخرى إذا كنت بحاجة إلى مزيد من الدعم.')
                    .setColor(getColor('default')),
            ],
            components: [],
        });
    },
};

export default [feedbackHandler, commentHandler, declineHandler];
