import { EmbedBuilder } from 'discord.js';
import { deleteBirthday } from '../../../services/birthdayService.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        // تأجيل الرد بأمان لمنع انتهاء مهلة التفاعل (Interaction Timeout)
        await InteractionHelper.safeDefer(interaction);

        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // محاولة حذف تاريخ عيد الميلاد عبر الخدمة المخصصة
        const result = await deleteBirthday(client, guildId, userId);

        // إذا لم يتم العثور على تاريخ عيد ميلاد مسجل للمستخدم
        if (result.status === 'not_found') {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('لم يتم العثور على عيد ميلاد')
                .setDescription('ليس لديك عيد ميلاد مسجل لإزالته.');
            
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
            return;
        }

        // في حال تم الحذف بنجاح
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('تمت إزالة عيد الميلاد')
            .setDescription('تم إزالة عيد ميلادك بنجاح من السيرفر.');
            
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });
    }
};
