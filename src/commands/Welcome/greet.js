import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import greetDashboard from './modules/greet_dashboard.js';

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('greet')
        .setDescription('إدارة إعدادات الترحيب والوداع')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('فتح لوحة تحكم إعدادات الترحيب والوداع'),
        ),

    async execute(interaction, config, client) {
        try {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'أنت بحاجة إلى صلاحية **إدارة الخادم** لاستخدام `/greet`.' });
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'dashboard':
                    return await greetDashboard.execute(interaction, config, client);
                default:
                    logger.warn(`أمر فرعي غير معروف في /greet: ${subcommand}`);
            }
        } catch (error) {
            if (error instanceof TitanBotError) {
                return await replyUserError(interaction, { type: ErrorTypes.CONFIGURATION, message: error.userMessage || 'حدث خطأ ما.' });
            }
            await handleInteractionError(interaction, error, { command: 'greet' });
        }
    },
};
