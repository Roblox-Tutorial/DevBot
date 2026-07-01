import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("owner")
        .setDescription("Display information about the user executing the command")
        .setDMPermission(true), // Enabled in DMs since it just reads user data
    category: "utility",

    async execute(interaction, config, client) {
        // 1. Defer the reply safely using your project's InteractionHelper
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Owner interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'owner'
            });
            return;
        }

        try {
            const user = interaction.user;
            const member = interaction.member; // Returns guild-specific member object if used in a server

            // 2. Format localized dynamic timestamps for Discord (<t:unix:R> = Relative time)
            const createdTimestamp = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
            const joinedTimestamp = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Not inside a server";

            // 3. Build the embed message populated with user details
            const embedDescription = `### User Details\n` +
                `**• Tag:** ${user.tag}\n` +
                `**• ID:** \`${user.id}\`\n` +
                `**• Created:** ${createdTimestamp}\n` +
                `**• Joined Server:** ${joinedTimestamp}`;

            const responseEmbed = infoEmbed(
                `Information for ${user.username}`,
                embedDescription
            ).setThumbnail(user.displayAvatarURL({ dynamic: true }));

            // 4. Update the deferred message safely
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [responseEmbed],
            });

        } catch (error) {
            logger.error('Owner command error:', error);
            
            // Reverted to manual interaction fallback edit because ErrorTypes/replyUserError was missing from your base code snippet
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    warningEmbed(
                        "Command Error",
                        "An unexpected error occurred while processing your user information."
                    )
                ]
            });
        }
    }
};
