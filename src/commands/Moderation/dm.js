import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("dm")
        .setDescription("Send a direct message to a user (Staff only)")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to send a DM to")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("The message to send")
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName("anonymous")
                .setDescription("Send the message anonymously (default: false)")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`DM interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'dm'
            });
            return;
        }

        const targetUser = interaction.options.getUser("user");
        const message = interaction.options.getString("message");
        const anonymous = interaction.options.getBoolean("anonymous") || false;

        try {
            if (message.length > 2000) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Messages must be under 2000 characters.' });
            }

            if (targetUser.bot) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'You cannot send DMs to bot accounts.' });
            }

            const sanitized = sanitizeMarkdown(message);

            // Génération de l'embed via votre utilitaire
            const userEmbed = successEmbed(
                anonymous ? "Message from the Staff Team" : `Message from ${interaction.user.tag}`,
                sanitized
            );

            // FORCE L'INJECTION DU FOOTER (Gère à la fois l'objet EmbedBuilder de Discord.js et les objets JSON bruts)
            const footerText = `You cannot reply to this message. | Logger ID: ${interaction.id}`;
            if (typeof userEmbed.setFooter === 'function') {
                userEmbed.setFooter({ text: footerText });
            } else if (userEmbed.data) {
                userEmbed.data.footer = { text: footerText };
            } else {
                userEmbed.footer = { text: footerText };
            }

            const dmChannel = await targetUser.createDM();
            await dmChannel.send({ embeds: [userEmbed] });

            // Envoi des logs avec l'exécuteur et le contenu du message inclus
            await logEvent({
                client: interaction.client,
                guild: interaction.guild,
                event: {
                    action: "DM Sent",
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Anonymous: ${anonymous ? 'Yes' : 'No'}`,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        moderatorTag: interaction.user.tag,
                        messageContent: message,
                        anonymous,
                        messageLength: sanitized.length
                    }
                }
            });

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        "DM Sent",
                        `Successfully sent a message to ${targetUser.tag}`
                    ),
                ],
            });
        } catch (error) {
            logger.error('DM command error:', error);
            
            if (error.code === 50007) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `Could not send a DM to ${targetUser.tag}. They may have DMs disabled.` });
            }
            
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `Failed to send DM: ${error.message}` });
        }
    }
};
