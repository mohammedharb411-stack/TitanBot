import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticket/ticketPermissions.js';
import { closeTicket } from '../../services/ticket.js';
export default {
    data: new SlashCommandBuilder()
        .setName("close")
        .setDescription("إغلاق التذكرة الحالية.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("سبب إغلاق التذكرة.")
                .setRequired(false),
        ),

    async execute(interaction, guildConfig, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        const permissionContext = await getTicketPermissionContext({ client, interaction });
        if (!permissionContext.ticketData) {
            return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'لا يمكن استخدام هذا الأمر إلا في قناة تذاكر صالحة.' });
        }

        if (!permissionContext.canCloseTicket) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'أنت بحاجة إلى إذن "إدارة القنوات"، أو دور "موظف التذاكر" المُكوّن، أو أن تكون منشئ التذكرة لإغلاق هذه التذكرة.' });
        }

        const reason =
            interaction.options?.getString("reason") ||
            "تم إغلاقها عبر أمر دون سبب محدد.";

        await closeTicket(interaction.channel, interaction.user, reason);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    "تم إغلاق التذكرة!",
                    "تم إغلاق هذه التذكرة بنجاح.",
                ),
            ],
        });

        logger.info('تم إغلاق التذكرة بنجاح', {
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            guildId: interaction.guildId,
            reason: reason,
            commandName: 'close'
        });
    },
};
