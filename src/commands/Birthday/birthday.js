import { SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

// استيراد وحدات الأوامر الفرعية
import birthdaySet from './modules/birthday_set.js';
import birthdayInfo from './modules/birthday_info.js';
import birthdayList from './modules/birthday_list.js';
import birthdayRemove from './modules/birthday_remove.js';
import nextBirthdays from './modules/next_birthdays.js';
import birthdaySetchannel from './modules/birthday_setchannel.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    // تعريف بياتات الأمر الرئيسي /birthday
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('أوامر نظام أعياد الميلاد')
        
        // الأمر الفرعي: set (ضبط عيد الميلاد)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('تحديد تاريخ عيد ميلادك')
                .addIntegerOption(option =>
                    option
                        .setName('month')
                        .setDescription('شهر الميلاد (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option
                        .setName('day')
                        .setDescription('يوم الميلاد (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )
        
        // الأمر الفرعي: info (عرض معلومات)
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('عرض معلومات عيد الميلاد')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('المستخدم المراد الفحص عنه')
                        .setRequired(false)
                )
        )
        
        // الأمر الفرعي: list (القائمة)
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض جميع أعياد الميلاد في السيرفر')
        )
        
        // الأمر الفرعي: remove (حذف)
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('حذف عيد ميلادك')
        )
        
        // الأمر الفرعي: next (القادمة)
        .addSubcommand(subcommand =>
            subcommand
                .setName('next')
                .setDescription('عرض أعياد الميلاد القادمة')
        )
        
        // الأمر الفرعي: setchannel (تحديد قناة الإشعارات)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('تعيين أو إلغاء قناة إعلانات أعياد الميلاد. (يتطلب صلاحية إدارة السيرفر)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('القناة النصية للإعلانات. اتركه فارغًا للإلغاء.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        ),

    // دالة تنفيذ الأمر عند استدعائه
    async execute(interaction, config, client) {
        // الحصول على اسم الأمر الفرعي الذي تم اختياره
        const subcommand = interaction.options.getSubcommand();

        // توجيه الطلب إلى الموديل المناسب
        switch (subcommand) {
            case 'set':
                return await birthdaySet.execute(interaction, config, client);
            case 'info':
                return await birthdayInfo.execute(interaction, config, client);
            case 'list':
                return await birthdayList.execute(interaction, config, client);
            case 'remove':
                return await birthdayRemove.execute(interaction, config, client);
            case 'next':
                return await nextBirthdays.execute(interaction, config, client);
            case 'setchannel':
                return await birthdaySetchannel.execute(interaction, config, client);
            default:
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'أمر فرعي غير معروف' });
        }
    }
};
