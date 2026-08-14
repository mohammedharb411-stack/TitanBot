import { PermissionsBitField, EmbedBuilder, MessageFlags } from 'discord.js';
import { getGuildConfig, setGuildConfig } from '../../../services/config/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        // التحقق من امتلاك العضو لصلاحية "إدارة السيرفر" (Manage Server)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('تم رفض الإذن')
                .setDescription('تحتاج إلى صلاحية **إدارة السيرفر (Manage Server)** لتكوين قناة أعياد الميلاد.');
            
            return InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                flags: MessageFlags.Ephemeral, // رسالة مخفية تظهر فقط للمستخدم
            });
        }

        try {
            // استخراج القناة المحددة ومعرّف السيرفر
            const channel = interaction.options.getChannel('channel');
            const guildId = interaction.guildId;
            const guildConfig = await getGuildConfig(client, guildId);

            // إذا تم اختيار قناة
            if (channel) {
                guildConfig.birthdayChannelId = channel.id;
                await setGuildConfig(client, guildId, guildConfig);

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('تم تفعيل إعلانات أعياد الميلاد')
                    .setDescription(`سيتم الآن نشر إعلانات أعياد الميلاد في ${channel}.`);

                return InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });
            } 
            // إذا لم يتم تحديد قناة (تعطيل الخدمة)
            else {
                guildConfig.birthdayChannelId = null;
                await setGuildConfig(client, guildId, guildConfig);

                const embed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('تم تعطيل إعلانات أعياد الميلاد')
                    .setDescription('لم تمزودنا بقناة — تم تعطيل إعلانات أعياد الميلاد.');

                return InteractionHelper.safeReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch (error) {
            // تسجيل الخطأ في نظام السجلات
            logger.error('خطأ في birthday_setchannel:', error);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ خطأ في الإعدادات')
                .setDescription('تعذّر حفظ إعدادات قناة أعياد الميلاد.');

            return InteractionHelper.safeReply(interaction, {
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
