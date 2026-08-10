import { SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import birthdaySet from './modules/birthday_set.js';
import birthdayInfo from './modules/birthday_info.js';
import birthdayList from './modules/birthday_list.js';
import birthdayRemove from './modules/birthday_remove.js';
import nextBirthdays from './modules/next_birthdays.js';
import birthdaySetchannel from './modules/birthday_setchannel.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('عيد ميلاد')
        .setDescription('أوامر نظام أعياد الميلاد')
        .addSubcommand(subcommand =>
            subcommand
                .setName('تعيين')
                .setDescription('حدد تاريخ ميلادك')
                .addIntegerOption(option =>
                    option
                        .setName('شهر')
                        .setDescription('شهر الميلاد (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option
                        .setName('يوم')
                        .setDescription('عيد ميلاد (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('معلومات')
                .setDescription('عرض معلومات عيد الميلاد')
                .addUserOption(option =>
                    option
                        .setName('مستخدم')
                        .setDescription('يمكن للمستخدم التحقق من تاريخ الميلاد لـ')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('قائمة')
                .setDescription('اعرض جميع أعياد الميلاد في الخادم')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('يزيل')
                .setDescription('قم بإزالة تاريخ ميلادك')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('التالي')
                .setDescription('عرض أعياد الميلاد القادمة')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ضبط القناة')
                .setDescription('قم بتعيين أو تعطيل القناة الخاصة بإعلانات أعياد الميلاد. (إدارة الخادم مطلوبة)')
                .addChannelOption(option =>
                    option
                        .setName('قناة')
                        .setDescription('قناة الرسائل النصية للإعلانات. اتركها فارغة لتعطيلها..')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        ),

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

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
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Unknown subcommand' });
        }
    }
};
