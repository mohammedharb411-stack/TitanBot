import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticket/ticketPermissions.js';
import { updateTicketPriority } from '../../services/ticket.js';

export default {
    data: new SlashCommandBuilder()
        .setName("priority")
        .setDescription("يحدد مستوى الأولوية لتكت الدعم الحالية.")
        .addStringOption((option) =>
            option
                .setName("level")
                .setDescription("مستوى أولوية التكت.")
                .setRequired(true)
                .addChoices(
                    { name: "عاجل", value: "urgent" },
                    { name: "عالي", value: "high" },
                    { name: "واسطة", value: "medium" },
                    { name: "قليل", value: "low" },
                    { name: "لا أحد", value: "none" },
                ),
            )
        .setDMPermission(false),
    category: "Ticket",

    async execute(interaction, guildConfig, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        const permissionContext = await getTicketPermissionContext({ client, interaction });
        if (!permissionContext.ticketData) {
            return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'لا يمكن استخدام هذا الأمر إلا في قناة تكت صالحة.' });
        }

        if (!permissionContext.canManageTicket) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'تحتاج إلى إذن "إدارة القنوات" أو دور "موظف التكت" المُكوّن لتغيير أولوية التكت.' });
        }

        const priorityLevel = interaction.options.getString("level");
        await updateTicketPriority(interaction.channel, priorityLevel, interaction.user);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    "تم تحديث الأولوية",
                    `تم تحديد أولوية التكت إلى **${priorityLevel.toUpperCase()}**.`,
                ),
            ],
        });

        logger.info('تم تحديث أولوية التكت بنجاح', {
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            guildId: interaction.guildId,
            priority: priorityLevel,
            commandName: 'priority'
        });
    },
};
