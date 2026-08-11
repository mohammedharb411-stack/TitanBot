import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { ErrorTypes, replyUserError } from '../../utils/errorHandler.js';

function createAutoroleInfoEmbed(description) {
    return new EmbedBuilder()
        .setColor(getColor('primary'))
        .setDescription(description)
        .setFooter({ text: new Date().toLocaleString() });
}

export default {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('إدارة الأدوار التي يتم تعيينها تلقائيًا للأعضاء الجدد')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('أضف دورًا ليتم تعيينه تلقائيًا للأعضاء الجدد')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إزالة دور من التعيين التلقائي')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الدور الذي يجب إزالته')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('اذكر جميع الأدوار المعينة تلقائيًا')),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`فشل تأجيل تفاعل الدور الذاتي`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'أوتورو'
            });
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'أنت بحاجة إلى إذن **إدارة الخادم** لاستخدام `/autorole`.' });
        }

    const { options, guild, client } = interaction;
        const subcommand = options.getSubcommand();

        if (subcommand === 'add') {
            const role = options.getRole('role');

            const guildConfig = await getGuildConfig(client, guild.id);
            const verificationEnabled = Boolean(guildConfig.verification?.enabled);
            const autoVerifyEnabled = Boolean(guildConfig.verification?.autoVerify?.enabled);

            if (verificationEnabled || autoVerifyEnabled) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'لا يمكنك إضافة AutoRole أثناء تفعيل نظام التحقق أو AutoVerify. قم بتعطيلهما أولاً.' });
            }
            
            if (role.position >= guild.members.me.roles.highest.position) {
                logger.warn(`[دور تلقائي] المستخدم ${interaction.user.tag} حاولت إضافة دور ${role.name} (${role.id}) أعلى من أعلى دور للروبوت في${guild.name}`);
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'أنا استطيع\'t تعيين أدوار أعلى من أعلى دور لي.' });
            }

            try {
                const config = await getWelcomeConfig(client, guild.id);
                const existingRoles = config.roleIds || [];
                const currentRoleId = existingRoles[0] || null;

                if (currentRoleId === role.id) {
                    logger.info(`[دور تلقائي] المستخدم ${interaction.user.tag} محاولة إضافة دور مكرر ${role.name} (${role.id}) في ${guild.name}`);
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `الدور ${role} تم بالفعل ضبطها على التعيين التلقائي.` });
                }

                await updateWelcomeConfig(client, guild.id, {
                    roleIds: [role.id]
                });

                logger.info(`[الدور التلقائي] اضبط الدور التلقائي الفردي على ${role.name} (${role.id}) في ${guild.name} by ${interaction.user.tag}`);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [createAutoroleInfoEmbed(
                        currentRoleId
                            ? `✅ تم تحديث دور تلقائي إلى ${role}. يُسمح بدوران تلقائي واحد فقط.`
                            : `✅ تم ضبط خاصية الدوران التلقائي على ${role}.`
                    )],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                logger.error(`[الدور التلقائي] فشل إضافة دور للنقابة ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'حدث خطأ أثناء إضافة الدور. يرجى المحاولة مرة أخرى.' });
            }
        } 
        
        else if (subcommand === 'remove') {
            const role = options.getRole('role');

            try {
                const config = await getWelcomeConfig(client, guild.id);
                const existingRoles = config.roleIds || [];
                
                if (!existingRoles.includes(role.id)) {
                    logger.info(`[الدور التلقائي] مستخدم ${interaction.user.tag} محاولة إزالة دور غير موجود ${role.name} (${role.id}) في ${guild.name}`);
                    return await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: `الدور${role} لم يتم ضبطه ليتم تعيينه تلقائيًا.` });
                }

                const updatedRoles = existingRoles.filter(id => id !== role.id);
                
                await updateWelcomeConfig(client, guild.id, {
                    roleIds: updatedRoles
                });

                logger.info(`[الدور التلقائي] تم حذف الدور ${role.name} (${role.id}) من التعيين التلقائي في ${guild.name} by ${interaction.user.tag}`);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [createAutoroleInfoEmbed(`✅ تمت إزالته ${role} من الأدوار المعينة تلقائياً.`)],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                logger.error(`[الدور التلقائي] فشل في إزالة الدور الخاص بالنقابة ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'حدث خطأ أثناء إزالة الدور. يرجى المحاولة مرة أخرى.' });
            }
        }
        
        else if (subcommand === 'list') {
            try {
                const guildConfig = await getGuildConfig(client, guild.id);
                const verificationEnabled = Boolean(guildConfig.verification?.enabled);
                const autoVerifyEnabled = Boolean(guildConfig.verification?.autoVerify?.enabled);
                const conflictSummary = [
                    verificationEnabled ? 'تم تفعيل نظام التحقق' : null,
                    autoVerifyEnabled ? 'تم تفعيل التحقق التلقائي' : null
                ].filter(Boolean).join('\n');

                const config = await getWelcomeConfig(client, guild.id);
                const autoRoles = Array.isArray(config.roleIds) ? config.roleIds : [];

                const singleRoleIds = autoRoles.length > 1 ? [autoRoles[0]] : autoRoles;
                if (singleRoleIds.length !== autoRoles.length) {
                    await updateWelcomeConfig(client, guild.id, {
                        roleIds: singleRoleIds
                    });
                    logger.info(`[الدور التلقائي] تم تقليص قائمة الأدوار التلقائية إلى دور واحد في ${interaction.guild.name}`);
                }

                if (singleRoleIds.length === 0) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [createAutoroleInfoEmbed(`ℹ️ لم يتم تحديد أي دور ليتم تعيينه تلقائياً.${conflictSummary ?`\n\n⚠️ إعداد مانعات الإعداد:\n${conflictSummary}`: ''}`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                const roles = await guild.roles.fetch();
                const validRoles = [];
                const invalidRoleIds = [];
                
                for (const roleId of singleRoleIds) {
                    const role = roles.get(roleId);
                    if (role) {
                        validRoles.push(role);
                    } else {
                        invalidRoleIds.push(roleId);
                    }
                }

                if (invalidRoleIds.length > 0) {
                    logger.info(`[الدور التلقائي] التنظيف${invalidRoleIds.length} أدوار غير صالحة من النقابة ${interaction.guild.name}`);
                    const updatedRoles = singleRoleIds.filter(id => !invalidRoleIds.includes(id));
                    await updateWelcomeConfig(client, guild.id, {
                        roleIds: updatedRoles
                    });
                }

                if (validRoles.length === 0) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [createAutoroleInfoEmbed(`ℹ️ لم يتم العثور على أي دور تلقائي صالح. تمت إزالة أي دور غير صالح..${conflictSummary ?`\n\n⚠️ إعداد مانعات الإعداد:\n${conflictSummary}`: ''}`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(getColor('info'))
                    .setTitle('الدور المعين تلقائياً')
                    .setDescription(`${validRoles[0]}${conflictSummary ?`\n\n⚠️ إعداد مانعات الإعداد:\n${conflictSummary}`: ''}`)
                    .setFooter({ text: 'لا يمكن تهيئة سوى دور تلقائي واحد.' });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                logger.error(`[الدور التلقائي] فشل في إدراج أدوار النقابة ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'حدث خطأ أثناء عرض قائمة الأدوار المعينة تلقائياً. يرجى المحاولة مرة أخرى.' });
            }
        }
    },
};
