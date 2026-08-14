import { EmbedBuilder } from 'discord.js';
import { getUserBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        // تأجيل الرد بأمان لمنع انتهاء مهلة التفاعل (Interaction Timeout)
        await InteractionHelper.safeDefer(interaction);

        // تحديد المستخدم المستهدف (المحدد في الأمر أو منفذ الأمر نفسه)
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const userId = targetUser.id;
        const guildId = interaction.guildId;

        // جلب بيانات عيد الميلاد من الخدمة المخصصة
        const birthdayData = await getUserBirthday(client, guildId, userId);

        // إذا لم يتم العثور على بيانات عيد الميلاد
        if (!birthdayData) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('لم يتم العثور على عيد ميلاد')
                .setDescription(targetUser.id === interaction.user.id 
                    ? "لم تقم بتحديد عيد ميلادك بعد. استخدم الأمر `/birthday set` لإضافته!"
                    : `لم يقم ${targetUser.username} بتحديد عيد ميلاده بعد.`);
            
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        // في حال توفر بيانات عيد الميلاد
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('معلومات عيد الميلاد')
            .setDescription(`**التاريخ:** ${birthdayData.monthName} ${birthdayData.day}\n**المستخدم:** ${targetUser.toString()}`);

        // تعديل الرد وإرسال البيانات
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        // تسجيل العملية بنجاح في نظام السجلات (Logs)
        logger.info('تم استرجاع معلومات عيد الميلاد بنجاح', {
            userId: interaction.user.id,
            targetUserId: targetUser.id,
            guildId,
            commandName: 'birthday_info'
        });
    }
};
