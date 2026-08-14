import { EmbedBuilder } from 'discord.js';
import { getUpcomingBirthdays } from '../../../services/birthdayService.js';
import { deleteBirthday } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        // تأجيل الرد بأمان لمنع انتهاء مهلة التفاعل (Interaction Timeout)
        await InteractionHelper.safeDefer(interaction);

        // جلب أحدث 5 أعياد ميلاد قادمة للسيرفر
        const next5 = await getUpcomingBirthdays(client, interaction.guildId, 5);

        // إذا لم يتم العثور على أعياد ميلاد مسجلة
        if (next5.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('لم يتم العثور على أعياد ميلاد')
                .setDescription('لم يتم إعداد أعياد ميلاد في هذا السيرفر بعد. استخدم الأمر `/birthday set` لإضافة عيد ميلادك!');
            
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        // التكرار الأول: التحقق من وجود الأعضاء في السيرفر وحذف المغادرين من قاعدة البيانات
        let displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                // إذا لم يعد العضو موجودًا، يتم حذف أعياد ميلاده تلقائيًا
                deleteBirthday(client, interaction.guildId, birthday.userId).catch(() => null);
                continue;
            }
            displayIndex++;
        }

        // إذا تبين أن جميع أصحاب أعياد الميلاد المحددة قد غادروا السيرفر
        if (displayIndex === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('لا توجد أعياد ميلاد قادمة')
                .setDescription('لم يتم العثور على أعياد ميلاد قادمة لأعضاء السيرفر الحاليين.');
            
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        // التكرار الثاني: بناء نص القائمة لأعياد الميلاد القادمة
        let birthdayList = `🎂 **أحدث 5 أعياد ميلاد قادمة**\n\nإليك أعياد الميلاد الخمسة القادمة في ${interaction.guild.name}:\n\n`;
        displayIndex = 0;

        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                continue;
            }
            displayIndex++;

            // صيغة الوقت المتبقي
            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **اليوم!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **غداً!**';
            } else {
                timeUntil = `خلال ${birthday.daysUntil} ${birthday.daysUntil > 10 ? 'يوماً' : 'أيام'}`;
            }

            // إضافة بيانات كل شخص للقائمة
            birthdayList += `${displayIndex}. **${member.displayName}**\n<@${birthday.userId}>\n📅 **التاريخ:** ${birthday.monthName} ${birthday.day}\n⏰ **الوقت:** ${timeUntil}\n\n`;
        }

        birthdayList += `استخدم الأمر /birthday set لإضافة عيد ميلادك!`;

        // إنشاء وتنسيق الـ Embed بالرسالة الناجحة
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('أحدث 5 أعياد ميلاد قادمة')
            .setDescription(birthdayList);

        // تعديل الرد المبدئي وإرسال النتيجة النهائية
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        // تسجيل العملية في نظام السجلات (Logs)
        logger.info('تم استرجاع أعياد الميلاد القادمة بنجاح', {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            upcomingCount: displayIndex,
            commandName: 'next_birthdays'
        });
    }
};
