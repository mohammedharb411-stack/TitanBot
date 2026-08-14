import { EmbedBuilder } from 'discord.js';
import { setBirthday } from '../../../services/birthdayService.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        // تأجيل الرد بأمان لمنع انتهاء مهلة التفاعل (Interaction Timeout)
        await InteractionHelper.safeDefer(interaction);

        // استخراج خيارات الشهر واليوم ومعرفات العضو والسيرفر
        const month = interaction.options.getInteger("month");
        const day = interaction.options.getInteger("day");
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // حفظ عيد الميلاد عبر الخدمة المخصصة
        const result = await setBirthday(client, guildId, userId, month, day);

        // إنشاء رسالة التنسيق (Embed) للتأكيد
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('تم تحديد عيد الميلاد!')
            .setDescription(`تم ضبط عيد ميلادك بنجاح على **${result.data.monthName} ${result.data.day}**!`);

        // تعديل الرد المبدئي وإرسال النتيجة للمستخدم
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });
    }
};
