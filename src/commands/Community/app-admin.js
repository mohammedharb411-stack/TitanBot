import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, LabelBuilder, RoleSelectMenuBuilder } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getColor, getApplicationStatusColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';
import { withErrorHandling, createError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import ApplicationService from '../../services/applicationService.js';
import { 
    getApplicationSettings, 
    saveApplicationSettings, 
    getApplication, 
    getApplications, 
    updateApplication,
    getApplicationRoles,
    saveApplicationRoles,
    getApplicationRoleSettings,
    saveApplicationRoleSettings,
    deleteApplication
} from '../../utils/database.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import appDashboard from './modules/app_dashboard.js';

// دالة مساعدة لتنسيق حالة الطلب (النص والرمز التعبيري) باللغة العربية
function getApplicationStatusPresentation(statusValue) {
    const normalized = typeof statusValue === 'string' ? statusValue.trim().toLowerCase() : 'unknown';
    const statusLabel =
        normalized === 'pending' ? 'قيد الانتظار' :
        normalized === 'approved' ? 'مقبول' :
        normalized === 'denied' ? 'مرفوض' :
        'غير معروف';
    const statusEmoji =
        normalized === 'pending' ? '🟡' :
        normalized === 'approved' ? '🟢' :
        normalized === 'denied' ? '🔴' :
        '⚪';

    return { normalized, statusLabel, statusEmoji };
}

export default {
    data: new SlashCommandBuilder()
    .setName("app-admin")
    .setDescription("إدارة طلبات الانضمام للإدارة والفرق")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
        subcommand
            .setName("setup")
            .setDescription("إعداد وتنسيق طلب جديد")
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("review")
            .setDescription("مراجعة طلب (قبول أو رفض)")
            .addStringOption((option) =>
                option
                    .setName("id")
                    .setDescription("معرّف الطلب (Application ID)")
                    .setRequired(true),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("list")
            .setDescription("عرض جميع الطلبات المقدمة")
            .addStringOption((option) =>
                option
                    .setName("status")
                    .setDescription("تصفية بحسب حالة الطلب")
                    .addChoices(
                        { name: "قيد الانتظار", value: "pending" },
                        { name: "مقبول", value: "approved" },
                        { name: "مرفوض", value: "denied" },
                    ),
            )
            .addStringOption((option) =>
                option.setName("role").setDescription("تصفية بحسب معرّف الرتبة"),
            )
            .addUserOption((option) =>
                option.setName("user").setDescription("تصفية بحسب المستخدم"),
            )
            .addNumberOption((option) =>
                option
                    .setName("limit")
                    .setDescription(
                        "الحد الأقصى لعدد الطلبات المعروضة (الافتراضي: 10)",
                    )
                    .setMinValue(1)
                    .setMaxValue(25),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("dashboard")
            .setDescription("فتح لوحة التحكم الخاصة بإعدادات الطلبات")
            .addStringOption((option) =>
                option
                    .setName("application")
                    .setDescription("اختر الطلب للتحكم بإعداداته")
                    .setRequired(false)
                    .setAutocomplete(true),
            ),
    ),

    category: "Community",

    // تنفيذ الأمر الرئيسي مع معالجة الشاملة للأخطاء
    execute: withErrorHandling(async (interaction) => {
        if (!interaction.inGuild()) {
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'يمكن استخدام هذا الأمر داخل السيرفرات فقط.' });
        }

        const { options, guild, member } = interaction;
        const subcommand = options.getSubcommand();

        if (subcommand !== 'dashboard' && subcommand !== 'setup') {
            await InteractionHelper.safeDefer(interaction, { flags: ['Ephemeral'] });
        }

        logger.info(`تم تنفيذ أمر app-admin: ${subcommand}`, {
            userId: interaction.user.id,
            guildId: guild.id,
            subcommand
        });

        // التحقق من صلاحيات المدير لإدارة الطلبات
        await ApplicationService.checkManagerPermission(interaction.client, guild.id, member);

        if (subcommand === "setup") {
            await handleSetup(interaction);
        } else if (subcommand === "review") {
            await handleReview(interaction);
        } else if (subcommand === "list") {
            await handleList(interaction);
        } else if (subcommand === "dashboard") {
            const selectedAppName = interaction.options.getString("application");
            await appDashboard.execute(interaction, null, interaction.client, selectedAppName);
        }
    }, { type: 'command', commandName: 'app-admin' })
};

// دالة إنشاء وإعداد طلب جديد
async function handleSetup(interaction) {
    if (interaction.deferred || interaction.replied) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'تمت معالجة هذا التفاعل بالفعل. يرجى محاولة استخدام الأمر مرة أخرى.' });
    }

    const modal = new ModalBuilder()
        .setCustomId('app_setup_modal')
        .setTitle('إعداد طلب انضمام جديد');

    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('role_id')
        .setPlaceholder('اختر الرتبة التي سيتقدم عليها الأعضاء')
        .setRequired(true);

    const roleLabel = new LabelBuilder()
        .setLabel('رتبة الطلب')
        .setDescription('الرتبة التي سيحصل عليها العضو عند قبول طلبه')
        .setRoleSelectMenuComponent(roleSelect);

    const appNameInput = new TextInputBuilder()
        .setCustomId('app_name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('مثال: مشرف، مساعد، مطور')
        .setMaxLength(50)
        .setMinLength(1)
        .setRequired(true);

    const appNameLabel = new LabelBuilder()
        .setLabel('اسم الطلب')
        .setTextInputComponent(appNameInput);

    const q1Input = new TextInputBuilder()
        .setCustomId('app_question_1')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('لماذا ترغب في الحصول على هذه الرتبة؟')
        .setMaxLength(100)
        .setMinLength(1)
        .setRequired(true);

    const q1Label = new LabelBuilder()
        .setLabel('السؤال الأول (إجباري)')
        .setTextInputComponent(q1Input);

    const q2Input = new TextInputBuilder()
        .setCustomId('app_question_2')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ما هي خبراتك السابقة؟')
        .setMaxLength(100)
        .setRequired(false);

    const q2Label = new LabelBuilder()
        .setLabel('السؤال الثاني (اختياري)')
        .setTextInputComponent(q2Input);

    const q3Input = new TextInputBuilder()
        .setCustomId('app_question_3')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(false);

    const q3Label = new LabelBuilder()
        .setLabel('السؤال الثالث (اختياري)')
        .setTextInputComponent(q3Input);

    modal.addLabelComponents(roleLabel, appNameLabel, q1Label, q2Label, q3Label);

    await interaction.showModal(modal);

    // انتظار إرسال النموذج من قبل المشرف
    const submitted = await interaction.awaitModalSubmit({
        time: 15 * 60 * 1000, 
        filter: (i) =>
            i.customId === 'app_setup_modal' &&
            i.user.id === interaction.user.id,
    }).catch(() => null);

    if (!submitted) {
        logger.info('تم إلغاء نموذج إعداد الطلب أو انتهت مهلته', { guildId: interaction.guild.id, userId: interaction.user.id });
        return;
    }

    const appName = submitted.fields.getTextInputValue('app_name').trim();
    const selectedRoles = submitted.fields.getSelectedRoles('role_id');
    const roleId = selectedRoles.first()?.id;

    if (!roleId) {
        await replyUserError(submitted, { type: ErrorTypes.USER_INPUT, message: 'يجب عليك تحديد رتبة للطلب.' });
        return;
    }

    const questions = [
        submitted.fields.getTextInputValue('app_question_1').trim(),
        submitted.fields.getTextInputValue('app_question_2').trim(),
        submitted.fields.getTextInputValue('app_question_3').trim(),
    ].filter(q => q.length > 0);

    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
        await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'لم يتم العثور على الرتبة المحددة.' });
        return;
    }

    const existingRoles = await getApplicationRoles(interaction.client, interaction.guild.id);
    if (existingRoles.some(r => r.roleId === roleId)) {
        await replyUserError(submitted, { type: ErrorTypes.CONFIGURATION, message: `الرتبة ${role} معدّة مسبقاً كطلب انضمام.` });
        return;
    }

    existingRoles.push({
        roleId: roleId,
        name: appName,
        enabled: true,  
    });

    await saveApplicationRoles(interaction.client, interaction.guild.id, existingRoles);

    const settings = await getApplicationSettings(interaction.client, interaction.guild.id);
    if (!settings.enabled) {
        await ApplicationService.updateSettings(interaction.client, interaction.guild.id, { enabled: true });
    }

    await saveApplicationRoleSettings(interaction.client, interaction.guild.id, roleId, { questions });

    await submitted.reply({
        embeds: [successEmbed(
            '✅ تم إنشاء الطلب',
            `تم إنشاء طلب **${appName}** بنجاح للرتبة ${role}.\n\nيمكنك تخصيص قناة السجلات، ورتب المسؤولين، والأسئلة، وفترة الاحتفاظ بالبيانات من خلال لوحة التحكم.`,
        )],
        flags: ['Ephemeral'],
    });

    setTimeout(() => {
        appDashboard.execute(submitted, null, interaction.client, appName);
    }, 500);
}

// دالة مراجعة الطلبات (القبول أو الرفض)
async function handleReview(interaction) {
    const appId = interaction.options.getString("id");

    const application = await getApplication(
        interaction.client,
        interaction.guild.id,
        appId,
    );
    if (!application) {
        return await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: 'لم يتم العثور على الطلب.' });
    }

    if (application.status !== "pending") {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'تمت معالجة هذا الطلب مسبقاً.' });
    }

    const appEmbed = createEmbed({
        title: `مراجعة الطلب`,
        description: `**المستخدم:** <@${application.userId}>\n**الطلب:** ${application.roleName}\n**معرّف الطلب:** \`${appId}\``,
        color: 'info',
    });

    if (application.answers && application.answers.length > 0) {
        application.answers.forEach((item, index) => {
            appEmbed.addFields({
                name: `س${index + 1}: ${item.question}`,
                value: item.answer || '*لا توجد إجابة*',
                inline: false
            });
        });
    }

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`app_review_approve_${appId}`)
            .setLabel('قبول')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`app_review_deny_${appId}`)
            .setLabel('رفض')
            .setStyle(ButtonStyle.Danger),
    );

    await InteractionHelper.safeEditReply(interaction, {
        embeds: [appEmbed],
        components: [buttonRow],
        flags: ["Ephemeral"],
    });

    const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i =>
            i.user.id === interaction.user.id &&
            (i.customId.startsWith(`app_review_approve_${appId}`) ||
             i.customId.startsWith(`app_review_deny_${appId}`)),
        time: 300_000, 
        max: 1,
    });

    collector.on('collect', async buttonInteraction => {
        const isApprove = buttonInteraction.customId.includes('approve');

        const reasonModal = new ModalBuilder()
            .setCustomId(`app_review_reason_${appId}_${isApprove ? 'approve' : 'deny'}`)
            .setTitle(`${isApprove ? 'قبول' : 'رفض'} الطلب - السبب`);

        reasonModal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('review_reason')
                    .setLabel('السبب (اختياري)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب القرار هنا...')
                    .setMaxLength(500)
                    .setRequired(false),
            ),
        );

        await buttonInteraction.showModal(reasonModal);

        try {
            const reasonSubmit = await buttonInteraction.awaitModalSubmit({
                time: 5 * 60 * 1000, 
                filter: i =>
                    i.customId === `app_review_reason_${appId}_${isApprove ? 'approve' : 'deny'}` &&
                    i.user.id === buttonInteraction.user.id,
            }).catch(() => null);

            if (!reasonSubmit) return;

            const reason = reasonSubmit.fields.getTextInputValue('review_reason').trim() || "لم يتم تقديم سبب.";
            const action = isApprove ? 'approve' : 'deny';
            const status = isApprove ? 'approved' : 'denied';

            // تحديث حالة الطلب في القاعدة
            const updatedApplication = await ApplicationService.reviewApplication(
                reasonSubmit.client,
                interaction.guild.id,
                appId,
                {
                    action,
                    reason,
                    reviewerId: reasonSubmit.user.id
                }
            );

            // إرسال رسالة خاصة للمتقدم بالنتيجة
            try {
                const user = await reasonSubmit.client.users.fetch(application.userId);
                const statusColor = getApplicationStatusColor(status);
                const reviewStatus = getApplicationStatusPresentation(status);
                const dmEmbed = createEmbed({
                    title: `${reviewStatus.statusEmoji} تم ${reviewStatus.statusLabel} طلبك`,
                    description: `طلبك لرتبة **${application.roleName}** تم **${reviewStatus.statusLabel}**\n` +
                        `**ملاحظة:** ${reason}\n\n` +
                        `استخدم الأمر \`/apply status id:${appId}\` لعرض التفاصيل.`
                }).setColor(statusColor);

                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                logger.warn('فشل إرسال رسالة خاصة للمستخدم حول نتيجة مراجعة الطلب', {
                    error: error.message,
                    userId: application.userId,
                    applicationId: appId
                });
            }

            // تحديث رسالة السجل في القناة المخصصة
            if (application.logMessageId && application.logChannelId) {
                try {
                    const statusColor = getApplicationStatusColor(status);
                    const logChannel = interaction.guild.channels.cache.get(
                        application.logChannelId,
                    );
                    if (logChannel) {
                        const logMessage = await logChannel.messages.fetch(
                            application.logMessageId,
                        );
                        if (logMessage) {
                            const embed = logMessage.embeds[0];
                            if (embed) {
                                const reviewStatus = getApplicationStatusPresentation(status);
                                const newEmbed = EmbedBuilder.from(embed)
                                    .setColor(statusColor)
                                    .spliceFields(0, 1, {
                                        name: "الحالة",
                                        value: `${reviewStatus.statusEmoji} ${reviewStatus.statusLabel}`,
                                    });

                                await logMessage.edit({
                                    embeds: [newEmbed],
                                    components: [],
                                });
                            }
                        }
                    }
                } catch (error) {
                    logger.warn('فشل تحديث رسالة سجل الطلب', {
                        error: error.message,
                        applicationId: appId,
                        logMessageId: application.logMessageId
                    });
                }
            }

            // إعطاء الرتبة للمتقدم تلقائياً عند القبول
            if (isApprove) {
                try {
                    const member = await interaction.guild.members.fetch(
                        application.userId,
                    );
                    await member.roles.add(application.roleId);
                } catch (error) {
                    logger.error('فشل إعطاء الرتبة للمتقدم المقبول', {
                        error: error.message,
                        userId: application.userId,
                        roleId: application.roleId,
                        applicationId: appId
                    });
                }
            }

            await reasonSubmit.reply({
                embeds: [
                    successEmbed(
                        `حالة الطلب: ${status === 'approved' ? 'مقبول' : 'مرفوض'}`,
                        `تمت مراجعة الطلب و**${status === 'approved' ? 'قبوله' : 'رفضه'}** بنجاح.`,
                    ),
                ],
                flags: ["Ephemeral"],
            });

        } catch (error) {
            logger.error('خطأ أثناء مراجعة الطلب:', error);
            await replyUserError(buttonInteraction, { type: ErrorTypes.UNKNOWN, message: 'حدث خطأ أثناء مراجعة الطلب.' });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = createEmbed({
                title: 'انتهت المهلة',
                description: 'انتهت مهلة أزرار المراجعة.',
                color: 'warning',
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [timeoutEmbed],
                components: [],
            }).catch(() => {});
        }
    });
}

// دالة عرض قائمة الطلبات المقدمة
async function handleList(interaction) {
    const status = interaction.options.getString("status");
    const user = interaction.options.getUser("user");
    const limit = interaction.options.getNumber("limit") || 10;

    const filters = {};
    
    if (status) {
        filters.status = status;
    } else {
        filters.status = 'pending';
    }

    let applications = await getApplications(
        interaction.client,
        interaction.guild.id,
        filters,
    );

    // تصفية وحذف الطلبات للأعضاء المغادرين من السيرفر
    if (!user) {
        applications = await Promise.all(
            applications.map(async (app) => {
                try {
                    await interaction.guild.members.fetch(app.userId);
                    return app; 
                } catch {
                    await deleteApplication(interaction.client, interaction.guild.id, app.id, app.userId);
                    return null; 
                }
            })
        ).then(results => results.filter(Boolean)); 
    }

    if (user) {
        applications = applications.filter((app) => app.userId === user.id);
    }

    if (applications.length === 0) {
        const applicationRoles = await getApplicationRoles(interaction.client, interaction.guild.id);
        
        if (applicationRoles.length > 0) {
            const embed = createEmbed({ 
                title: "لم يتم العثور على طلبات", 
                description: "لم يتم العثور على طلبات مقدمة تطابق معايير البحث.\n\nومع ذلك، توجد الطلبات التالية المتاحة للتقديم:" 
            });

            applicationRoles.forEach((appRole, index) => {
                const role = interaction.guild.roles.cache.get(appRole.roleId);
                embed.addFields({
                    name: `${index + 1}. ${appRole.name}`,
                    value: `**الرتبة:** ${role ? `<@&${appRole.roleId}>` : 'الرتبة غير موجودة'}\n**متاحة للتقديم:** نعم`,
                    inline: false
                });
            });

            embed.setFooter({
                text: "يمكن للأعضاء التقديم باستخدام /apply submit أو عرض الرتب بالمر /apply list"
            });

            return InteractionHelper.safeEditReply(interaction, { embeds: [embed], flags: ["Ephemeral"] });
        } else {
            return await replyUserError(interaction, {
                type: ErrorTypes.CONFIGURATION,
                message: 'لم يتم العثور على طلبات ولم يتم إعداد أي رتب للتقديم بعد.\n' +
                    'استخدم الأمر `/app-admin setup` لإعداد طلبات الانضمام أولاً.'
            });
        }
    }

    applications = applications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

    const embed = createEmbed({ title: "الطلبات المقدمة", description: `عرض ${applications.length} طلب/طلبات.`, });

    applications.forEach((app) => {
        const statusView = getApplicationStatusPresentation(app?.status);
        const roleName = app?.roleName || 'رتبة غير معروفة';
        const username = app?.username || 'مستخدم غير معروف';
        const createdAt = app?.createdAt ? new Date(app.createdAt) : null;
        const createdAtDisplay = createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString('ar-EG')
            : 'تاريخ غير معروف';

        embed.addFields({
            name: `${statusView.statusEmoji} ${roleName} - ${username}`,
            value:
                `**المعرّف:** \`${app.id}\`\n` +
                `**الحالة:** ${statusView.statusEmoji} ${statusView.statusLabel}\n` +
                `**التاريخ:** ${createdAtDisplay}`,
            inline: true,
        });
    });

    await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed],
        flags: ["Ephemeral"],
    });
}
