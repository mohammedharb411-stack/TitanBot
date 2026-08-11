import { createEmbed } from '../../utils/embeds.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import { createInitialHelpMenu } from '../../commands/Core/help.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';

const BACK_BUTTON_ID = "help-back-to-main";
const PAGINATION_PREFIX = "help-page";
const BUG_REPORT_BUTTON_ID = "help-bug-report";

export const helpBackButton = {
    name: BACK_BUTTON_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { embeds, components } = await createInitialHelpMenu(client);
            await interaction.editReply({
                embeds,
                components,
            });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Help back button interaction already acknowledged or expired.', {
                    event: 'interaction.help.button.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};

export const helpBugReportButton = {
    name: BUG_REPORT_BUTTON_ID,
    async execute(interaction, client) {
        const githubButton = new ButtonBuilder()
            .setLabel('king dom')
            .setStyle(ButtonStyle.Link)
            .setURL('https://ptb.discord.com/channels/1526610936977166416/1526614440340881548');

        const bugRow = new ActionRowBuilder().addComponents(githubButton);

        const bugReportEmbed = createEmbed({
            title: 'king dom',
            description: 'هل وجدت خطأً؟ يرجى الإبلاغ عنه على صفحة المشكلات في king dom.!\n\n' +
                '**عند الإبلاغ عن خطأ برمجي، يرجى تضمين:**\n' +
                '• 📝 وصف تفصيلي للمشكلة\n' +
                '• 📋 خطوات إعادة إنتاج المشكلة\n' +
                '• 📸 لقطات الشاشة إن وجدت\n' +
                '• 💻 إصدار البوت الخاص بك وبيئته\n\n' +
                'هذا يساعدنا على حل المشكلات بشكل أسرع وأكثر فعالية!',
            color: 'error'
        });
        bugReportEmbed.setFooter({
            text: 'نظام الإبلاغ عن الأخطاء في king doom',
            iconURL: client.user.displayAvatarURL()
        });
        bugReportEmbed.setTimestamp();

        await interaction.reply({
            embeds: [bugReportEmbed],
            components: [bugRow],
            flags: MessageFlags.Ephemeral
        });
    },
};

function getPaginationInfo(components) {
    for (const row of components || []) {
        for (const component of row.components || []) {
            if (component.customId === `${PAGINATION_PREFIX}_page`) {
                const label = component.label || '';
                const match = label.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
                if (match) {
                    return {
                        currentPage: Number(match[1]),
                        totalPages: Number(match[2]),
                    };
                }
            }
        }
    }

    return { currentPage: 1, totalPages: 1 };
}

export const helpPaginationButton = {
    name: `${PAGINATION_PREFIX}_next`,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { currentPage, totalPages } = getPaginationInfo(interaction.message?.components);

            let nextPage = currentPage;
            switch (interaction.customId) {
                case `${PAGINATION_PREFIX}_first`:
                    nextPage = 1;
                    break;
                case `${PAGINATION_PREFIX}_prev`:
                    nextPage = Math.max(1, currentPage - 1);
                    break;
                case `${PAGINATION_PREFIX}_next`:
                    nextPage = Math.min(totalPages, currentPage + 1);
                    break;
                case `${PAGINATION_PREFIX}_last`:
                    nextPage = totalPages;
                    break;
                default:
                    nextPage = currentPage;
                    break;
            }

            const { embeds, components } = await createAllCommandsMenu(nextPage, client);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Help pagination interaction already acknowledged or expired.', {
                    event: 'interaction.help.pagination.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};
