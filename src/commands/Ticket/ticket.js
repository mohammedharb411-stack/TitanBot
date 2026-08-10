import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import ticketConfig from './modules/ticket_dashboard.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("يدير نظام التكت الخاص بالخادم.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("setup")
                .setDescription(
                    "يقوم بإعداد لوحة إنشاء التكت في قناة محددة.",
                )
                .addChannelOption((option) =>
                    option
.setName("panel_channel")
                        .setDescription(
                            "القناة التي سيتم إرسال لوحة التكت إليها.",
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )

                .addStringOption((option) =>
                    option
                        .setName("panel_message")
                        .setDescription(
                            "الرسالة/الوصف الرئيسي للوحة التكت.",
                        )
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("button_label")
                        .setDescription(
                            "التسمية الخاصة بزر إنشاء التكت (الافتراضي: إنشاء تكت)",
                        )
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("category")
                        .setDescription(
                            "الفئة التي سيتم فيها إنشاء التكت الجديدة (اختياري).",
                        )
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("closed_category")
                        .setDescription(
                            "الفئة التي سيتم نقل التكت المغلقة إليها (اختياري).",
                        )
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addRoleOption((option) =>
                    option
                        .setName("staff_role")
                        .setDescription(
                            "الدور الذي يمكنه الوصول إلى التكت (اختياري).",
                        )
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_tickets_per_user")
                        .setDescription("الحد الأقصى لعدد التكت التي يمكن للمستخدم إنشاؤها (الافتراضي: 3)")
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("dm_on_close")
                        .setDescription("إرسال رسالة خاصة إلى المستخدم عند إغلاق تذكرته (الافتراضي: صحيح)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("dashboard")
                .setDescription("افتح لوحة معلومات نظام التكت التفاعلي"),
        ),
    category: "ticket",

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ManageChannels,
            )
        ) {
            logger.warn('تم رفض إذن استخدام أمر التكت', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ticket'
            });
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'أنت بحاجة إلى إذن "إدارة القنوات" للقيام بهذا الإجراء.' });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "dashboard") {
            return ticketConfig.execute(interaction, config, client);
        }

        if (subcommand === "setup") {
            const existingConfig = await getGuildConfig(client, interaction.guildId);
            if (existingConfig?.ticketPanelChannelId) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `يحتوي هذا الخادم بالفعل على نظام تكت مُعدّ (لوحة التحكم في <#${existingConfig.ticketPanelChannelId}>).\n\nيدعم كل خادم نظام تكت واحد فقط. استخدم لوحة تحكم التكت لتعديل أو تحديث الإعداد الحالي، أو اختر "حذف النظام" من لوحة التحكم لإزالته والبدء من جديد.` });
            }

            const panelChannel =
                interaction.options.getChannel("panel_channel");
            const categoryChannel = interaction.options.getChannel("category");
            const closedCategoryChannel = interaction.options.getChannel("closed_category");
            const staffRole = interaction.options.getRole("staff_role");
const panelMessage = interaction.options.getString("panel_message") || "انقر على الزر أدناه لإنشاء تكت دعم.";
            const buttonLabel =
                interaction.options.getString("button_label") ||
"إنشاء تكت";
            const maxTicketsPerUser = interaction.options.getInteger("max_tickets_per_user") || 3;
const dmOnClose = interaction.options.getBoolean("dm_on_close") !== false;

            const setupEmbed = createEmbed({ 
                title: "فتح التكت من هنا", 
description: panelMessage,
                color: getColor('info')
            });

            const ticketButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
.setLabel(buttonLabel)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📩"),
            );

            try {
                const sentPanel = await panelChannel.send({
                    embeds: [setupEmbed],
                    components: [ticketButton],
                });

                if (client.db && interaction.guildId) {
                    const currentConfig = existingConfig;
                    currentConfig.ticketCategoryId = categoryChannel ? categoryChannel.id : null;
                    currentConfig.ticketClosedCategoryId = closedCategoryChannel ? closedCategoryChannel.id : null;
                    currentConfig.ticketStaffRoleId = staffRole ? staffRole.id : null;
                    currentConfig.ticketPanelChannelId = panelChannel.id;
                    currentConfig.ticketPanelMessageId = sentPanel?.id || null;
                    currentConfig.ticketPanelMessage = panelMessage;
                    currentConfig.ticketButtonLabel = buttonLabel;
                    currentConfig.maxTicketsPerUser = maxTicketsPerUser;
                    currentConfig.dmOnClose = dmOnClose;

                    await setGuildConfig(client, interaction.guildId, currentConfig);
                    logger.info('تم حفظ إعدادات التكت', {
                        guildId: interaction.guildId,
                        categoryId: categoryChannel?.id,
                        closedCategoryId: closedCategoryChannel?.id,
                        staffRoleId: staffRole?.id,
                        maxTickets: maxTicketsPerUser,
                        dmOnClose: dmOnClose,
                    });
                } else {
                    logger.error('إعداد التكت: قاعدة البيانات غير متاحة، تم إرسال اللوحة ولكن لم يتم حفظ الإعدادات', {
                        guildId: interaction.guildId,
                    });
                }

                let successMessage = `تم إرسال لوحة إنشاء التكت إلى ${panelChannel}.`;
                
                if (categoryChannel) {
                    successMessage += `سيتم إنشاء تكت جديدة في **${categoryChannel.name}** فئة.`;
                } else {
                    successMessage += 'سيتم إنشاء التكت الجديدة في قسم "التكت" الجديد.فئة.';
                }
                
                if (closedCategoryChannel) {
                    successMessage += `سيتم نقل التكت المغلقة إلى**${closedCategoryChannel.name}**.`;
                }
                
                if (staffRole) {
                    successMessage += `**${staffRole.name}** سيتمكن هذا الدور من الوصول إلى التكت.`;
                }
                
                successMessage += `\n\n**الحد الأقصى التكت لكل مستخدم:** ${maxTicketsPerUser}\n**رسالة خاصة عند الإغلاق:** ${dmOnClose ? 'مُفعّل' : 'عاجز'}`;

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "إعداد لوحة التكت",
                            successMessage,
                        ),
                    ],
                });

                logger.info('تم الانتهاء من إعداد لوحة التكت', {
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    guildId: interaction.guildId,
                    panelChannelId: panelChannel.id,
                    categoryId: categoryChannel?.id,
                    closedCategoryId: closedCategoryChannel?.id,
                    staffRoleId: staffRole?.id,
                    maxTickets: maxTicketsPerUser,
                    dmOnClose: dmOnClose,
                    commandName: 'ticket_setup'
                });

                const logEmbed = createEmbed({
                    title: "إعداد نظام التكت (سجل التكوين)",
                    description: `تم إنشاء لوحة التكت في ${panelChannel} بواسطة ${interaction.user}.`,
                    color: getColor('warning')
                })
                    .addFields(
                        {
                            name: "قناة اللوحةl",
                            value: panelChannel.toString(),
                            inline: true,
                        },
                        {
                            name: "فئة التكت",
                            value: categoryChannel
                                ? categoryChannel.toString()
                                : "لم يتم تحديد أي شيء.",
                            inline: true,
                        },
                        {
                            name: "فئة مغلقة",
                            value: closedCategoryChannel
                                ? closedCategoryChannel.toString()
                                : "لم يتم تحديد أي شيء.",
                            inline: true,
                        },
                        {
                            name: "دور الموظف",
                            value: staffRole
                                ? staffRole.toString()
                                : "لم يتم تحديد أي شيء.",
                            inline: true,
                        },
                        {
                            name: "الحد الأقصى التكت لكل مستخدم",
                            value: maxTicketsPerUser.toString(),
                            inline: true,
                        },
                        {
                            name: "رسالة خاصة عند الإغلاق",
                            value: dmOnClose ? 'مُفعّل' : 'عاجز',
                            inline: true,
                        },
                        {
                            name: "المشرف",
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: false,
                        },
                    );

            } catch (error) {
                logger.error('خطأ في إعداد التكت', {
                    error: error.message,
                    stack: error.stack,
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'ticket_setup'
                });
                if (interaction.deferred || interaction.replied) {
                    await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'تعذر إرسال لوحة التكت أو حفظ الإعدادات. يرجى مراجعة البوت.\'s الأذونات (وخاصة القدرة على إرسال الرسائل في القناة المستهدفة) واتصال قاعدة البيانات.' }).catch(err => {
                        logger.error('فشل إرسال رد الخطأ', {
                            error: err.message,
                            guildId: interaction.guildId
                        });
                    });
                } else {
                    await handleInteractionError(interaction, error, {
                        commandName: 'ticket_setup',
                        source: 'ticket_setup_command'
                    });
                }
            }
        }
    }
};
